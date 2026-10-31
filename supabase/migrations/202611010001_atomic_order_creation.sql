-- Atomic order creation RPC.
--
-- Fixes two issues flagged by code review:
--   1. api/orders.js previously inserted oc_orders and oc_order_items as two
--      separate REST calls. If the second call failed, an order could be left
--      with no line items. This RPC does both inserts inside one function
--      call, which PostgREST runs as a single database transaction — either
--      everything commits, or nothing does.
--   2. The old idempotency check queried oc_orders first, then inserted
--      separately; if that lookup query itself errored, the code "failed
--      open" and proceeded straight to insertion. This RPC folds the
--      idempotency lookup and the insert into the same atomic operation, so
--      there is no separate lookup step that can fail open — a lookup error
--      now fails the whole call, same as any other error.
--
-- Concurrency: two simultaneous requests with the same (scope_hash, key) can
-- both pass the "not found" check and attempt to insert. The loser hits the
-- oc_orders_idempotency_scope_key_unique constraint; the EXCEPTION block
-- catches that, rolls back its own partial work (PL/pgSQL wraps a block with
-- an EXCEPTION handler in an implicit subtransaction), and re-reads the
-- winner's row to return a replay or a conflict — never a half-written order.

create or replace function public.oc_create_order_with_items(
  p_order jsonb,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $oc_create_order$
declare
  v_scope_hash text := p_order->>'idempotency_scope_hash';
  v_key text := p_order->>'idempotency_key';
  v_fingerprint text := p_order->>'request_fingerprint';
  v_existing record;
  v_order_id uuid;
  v_item jsonb;
begin
  if v_scope_hash is null or v_key is null or v_fingerprint is null then
    raise exception 'order, idempotency scope, key and fingerprint are required';
  end if;

  -- Lock any existing row for this (scope, key) before deciding whether to
  -- insert, so a concurrent transaction updating the same row waits for us.
  select id, public_reference, request_fingerprint, subtotal_bdt, delivery_bdt, total_bdt, status
    into v_existing
    from public.oc_orders
    where idempotency_scope_hash = v_scope_hash and idempotency_key = v_key
    for update;

  if found then
    if v_existing.request_fingerprint = v_fingerprint then
      return jsonb_build_object(
        'replay', true,
        'id', v_existing.id,
        'public_reference', v_existing.public_reference,
        'subtotal_bdt', v_existing.subtotal_bdt,
        'delivery_bdt', v_existing.delivery_bdt,
        'total_bdt', v_existing.total_bdt,
        'status', v_existing.status
      );
    end if;
    raise exception 'IDEMPOTENCY_CONFLICT: this idempotency key was already used with a different order'
      using errcode = '23505';
  end if;

  insert into public.oc_orders (
    public_reference, idempotency_scope_hash, idempotency_key, request_fingerprint,
    lookup_token_hash, customer_name, phone, district, area, address,
    delivery_zone, subtotal_bdt, delivery_bdt, total_bdt, payment_method
  )
  values (
    p_order->>'public_reference',
    v_scope_hash,
    v_key,
    v_fingerprint,
    p_order->>'lookup_token_hash',
    p_order->>'customer_name',
    p_order->>'phone',
    p_order->>'district',
    p_order->>'area',
    p_order->>'address',
    p_order->>'delivery_zone',
    (p_order->>'subtotal_bdt')::bigint,
    (p_order->>'delivery_bdt')::bigint,
    (p_order->>'total_bdt')::bigint,
    coalesce(p_order->>'payment_method', 'cod')
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.oc_order_items (
      order_id, product_id, variant_id, product_title_snapshot, variant_snapshot,
      unit_price_bdt, quantity, line_total_bdt
    )
    values (
      v_order_id,
      v_item->>'product_id',
      nullif(v_item->>'variant_id', '')::uuid,
      v_item->>'product_title_snapshot',
      coalesce(v_item->'variant_snapshot', '{}'::jsonb),
      (v_item->>'unit_price_bdt')::integer,
      (v_item->>'quantity')::integer,
      (v_item->>'line_total_bdt')::bigint
    );
  end loop;

  return jsonb_build_object(
    'replay', false,
    'id', v_order_id,
    'public_reference', p_order->>'public_reference',
    'subtotal_bdt', (p_order->>'subtotal_bdt')::bigint,
    'delivery_bdt', (p_order->>'delivery_bdt')::bigint,
    'total_bdt', (p_order->>'total_bdt')::bigint,
    'status', 'pending_review'
  );

exception
  when unique_violation then
    -- A concurrent request won the race on (scope_hash, key) between our
    -- "not found" check and our insert. Re-read its row and resolve the same
    -- way the pre-check above would have.
    select id, public_reference, request_fingerprint, subtotal_bdt, delivery_bdt, total_bdt, status
      into v_existing
      from public.oc_orders
      where idempotency_scope_hash = v_scope_hash and idempotency_key = v_key;

    if found and v_existing.request_fingerprint = v_fingerprint then
      return jsonb_build_object(
        'replay', true,
        'id', v_existing.id,
        'public_reference', v_existing.public_reference,
        'subtotal_bdt', v_existing.subtotal_bdt,
        'delivery_bdt', v_existing.delivery_bdt,
        'total_bdt', v_existing.total_bdt,
        'status', v_existing.status
      );
    end if;

    raise exception 'IDEMPOTENCY_CONFLICT: this idempotency key was already used with a different order'
      using errcode = '23505';
end;
$oc_create_order$;

-- Service-role (used server-side only, bypasses RLS) is the only caller via
-- PostgREST's /rpc endpoint; no browser role is granted execute.
revoke all on function public.oc_create_order_with_items(jsonb, jsonb) from public, anon, authenticated;
