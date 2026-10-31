-- Fix: a replayed order request couldn't hand the customer a usable lookup
-- token.
--
-- api/orders.js generates a fresh lookupToken + lookupTokenHash on every
-- call (fresh attempt or retry alike), but only the *hash* is ever sent to
-- the database or stored — the raw token is never persisted, by design
-- (it's a bearer secret for looking an order up later; storing it in
-- plaintext would defeat the point). That's fine for a first, successful
-- insert: the fresh token is generated, its hash is stored, and the raw
-- token is handed back in the same response.
--
-- But if that response never reaches the customer (dropped connection,
-- refreshed page) and the checkout retries with the same Idempotency-Key,
-- oc_create_order_with_items recognised the replay and returned the order's
-- public_reference again — but not a lookupToken, because the one
-- originally stored was never received by anyone and can't be recovered
-- from its hash. A customer in this situation would be permanently unable
-- to use token-based lookup for an order they legitimately placed.
--
-- Fix: on a replay, rotate the stored lookup_token_hash to the hash of the
-- fresh token this request generated (the old one was never delivered to
-- anyone, so nothing is lost by invalidating it) and return it like a
-- normal success. Also return payment_method on both the fresh and replay
-- paths — the checkout UI's confirmation screen reads it to decide which
-- payment instructions to show, and the replay path was silently omitting
-- it too.

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
  v_new_lookup_token_hash text := p_order->>'lookup_token_hash';
  v_existing record;
  v_order_id uuid;
  v_item jsonb;
begin
  if v_scope_hash is null or v_key is null or v_fingerprint is null then
    raise exception 'order, idempotency scope, key and fingerprint are required';
  end if;

  -- Lock any existing row for this (scope, key) before deciding whether to
  -- insert, so a concurrent transaction updating the same row waits for us.
  select id, public_reference, request_fingerprint, subtotal_bdt, delivery_bdt, total_bdt, status, payment_method
    into v_existing
    from public.oc_orders
    where idempotency_scope_hash = v_scope_hash and idempotency_key = v_key
    for update;

  if found then
    if v_existing.request_fingerprint = v_fingerprint then
      -- Rotate the lookup token to the one this request generated. The
      -- previously stored one was never delivered to anyone (that's why
      -- we're here), so nothing is lost by replacing it.
      update public.oc_orders set lookup_token_hash = v_new_lookup_token_hash where id = v_existing.id;
      return jsonb_build_object(
        'replay', true,
        'id', v_existing.id,
        'public_reference', v_existing.public_reference,
        'subtotal_bdt', v_existing.subtotal_bdt,
        'delivery_bdt', v_existing.delivery_bdt,
        'total_bdt', v_existing.total_bdt,
        'status', v_existing.status,
        'payment_method', v_existing.payment_method
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
    v_new_lookup_token_hash,
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
    'status', 'pending_review',
    'payment_method', coalesce(p_order->>'payment_method', 'cod')
  );

exception
  when unique_violation then
    -- A concurrent request won the race on (scope_hash, key) between our
    -- "not found" check and our insert. Re-read its row and resolve the same
    -- way the pre-check above would have.
    select id, public_reference, request_fingerprint, subtotal_bdt, delivery_bdt, total_bdt, status, payment_method
      into v_existing
      from public.oc_orders
      where idempotency_scope_hash = v_scope_hash and idempotency_key = v_key;

    if found and v_existing.request_fingerprint = v_fingerprint then
      update public.oc_orders set lookup_token_hash = v_new_lookup_token_hash where id = v_existing.id;
      return jsonb_build_object(
        'replay', true,
        'id', v_existing.id,
        'public_reference', v_existing.public_reference,
        'subtotal_bdt', v_existing.subtotal_bdt,
        'delivery_bdt', v_existing.delivery_bdt,
        'total_bdt', v_existing.total_bdt,
        'status', v_existing.status,
        'payment_method', v_existing.payment_method
      );
    end if;

    raise exception 'IDEMPOTENCY_CONFLICT: this idempotency key was already used with a different order'
      using errcode = '23505';
end;
$oc_create_order$;

-- Service-role (used server-side only, bypasses RLS) is the only caller via
-- PostgREST's /rpc endpoint; no browser role is granted execute.
revoke all on function public.oc_create_order_with_items(jsonb, jsonb) from public, anon, authenticated;
