-- Outback Cartel order system schema (PostgreSQL)
-- Draft migration only. Do not apply to production until credentials, RLS,
-- admin identity, retention policy and API validation are configured.

create extension if not exists pgcrypto;

create table if not exists public.oc_products (
  id text primary key,
  source text not null check (source in ('house', 'supplier')),
  supplier_id text,
  title text not null,
  price_bdt integer not null check (price_bdt > 0),
  approved boolean not null default false,
  active boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.oc_product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references public.oc_products(id) on delete cascade,
  size text,
  colour text,
  availability text not null default 'unknown'
    check (availability in ('unknown', 'available', 'unavailable')),
  unique (product_id, size, colour),
  -- Enables order_items to prove a selected variant belongs to its product.
  unique (id, product_id)
);

create table if not exists public.oc_orders (
  id uuid primary key default gen_random_uuid(),
  public_reference text not null unique check (length(public_reference) between 8 and 64),
  idempotency_key text not null unique check (length(idempotency_key) between 16 and 200),
  lookup_token_hash text not null check (lookup_token_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'pending_review'
    check (status in ('pending_review', 'confirmed', 'processing', 'dispatched', 'delivered', 'cancelled')),
  customer_name text not null check (length(btrim(customer_name)) between 2 and 100),
  phone text not null check (phone ~ '^\+?[0-9][0-9 ()-]{7,30}$'),
  district text not null check (length(btrim(district)) between 1 and 80),
  area text check (area is null or length(btrim(area)) <= 100),
  address text not null check (length(btrim(address)) between 5 and 300),
  delivery_zone text not null check (delivery_zone in ('inside', 'sub', 'outside')),
  subtotal_bdt bigint not null check (subtotal_bdt >= 0),
  delivery_bdt bigint not null check (delivery_bdt >= 0),
  total_bdt bigint not null check (total_bdt = subtotal_bdt + delivery_bdt),
  constraint oc_orders_delivery_fee_matches_zone check (
    (subtotal_bdt >= 999 and delivery_bdt = 0) or
    (subtotal_bdt < 999 and delivery_bdt = case delivery_zone
      when 'inside' then 60 when 'sub' then 100 when 'outside' then 120 end)
  ),
  payment_method text not null default 'cod' check (payment_method = 'cod'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.oc_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.oc_orders(id) on delete cascade,
  product_id text not null references public.oc_products(id),
  variant_id uuid,
  product_title_snapshot text not null,
  variant_snapshot jsonb not null default '{}'::jsonb,
  unit_price_bdt integer not null check (unit_price_bdt > 0),
  quantity integer not null check (quantity between 1 and 99),
  line_total_bdt bigint not null check (line_total_bdt = unit_price_bdt::bigint * quantity),
  constraint oc_order_items_variant_product_fk
    foreign key (variant_id, product_id)
    references public.oc_product_variants(id, product_id)
);

create table if not exists public.oc_order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.oc_orders(id) on delete cascade,
  actor_id text not null,
  from_status text check (from_status is null or from_status in ('pending_review', 'confirmed', 'processing', 'dispatched', 'delivered', 'cancelled')),
  to_status text not null check (to_status in ('pending_review', 'confirmed', 'processing', 'dispatched', 'delivered', 'cancelled')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists oc_orders_created_at_idx on public.oc_orders (created_at desc);
create index if not exists oc_orders_status_idx on public.oc_orders (status);
create index if not exists oc_order_items_order_idx on public.oc_order_items (order_id);
create index if not exists oc_order_events_order_idx on public.oc_order_events (order_id, created_at);

-- Deny browser/API roles access to customer and order records by default.
-- The trusted server must use a server-only Supabase service-role credential.
-- RLS remains enabled as defence in depth if grants are changed later.
alter table public.oc_products enable row level security;
alter table public.oc_product_variants enable row level security;
alter table public.oc_orders enable row level security;
alter table public.oc_order_items enable row level security;
alter table public.oc_order_events enable row level security;

revoke all on table public.oc_products from public, anon, authenticated;
revoke all on table public.oc_product_variants from public, anon, authenticated;
revoke all on table public.oc_orders from public, anon, authenticated;
revoke all on table public.oc_order_items from public, anon, authenticated;
revoke all on table public.oc_order_events from public, anon, authenticated;


-- Enforce the documented state machine at the database boundary and append
-- an audit event in the same transaction as each status change.
-- SECURITY BOUNDARY: app.actor_id is caller-supplied transaction context, NOT
-- database authentication. This trigger only rejects a missing actor; it does
-- not prove the actor is an admin. Every privileged API must verify the admin
-- session/role first, derive the actor ID from that verified identity, then set
-- it with SET LOCAL inside the same transaction. Never trust request-body IDs
-- or expose the service-role credential to browsers/untrusted callers.
create or replace function public.oc_guard_order_status_change()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $oc_guard$
declare
  verified_actor text;
  allowed_transition boolean := false;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  verified_actor := nullif(btrim(current_setting('app.actor_id', true)), '');
  if verified_actor is null then
    raise exception 'A verified order actor is required for status changes'
      using errcode = '42501';
  end if;

  allowed_transition :=
    (old.status = 'pending_review' and new.status in ('confirmed', 'cancelled')) or
    (old.status = 'confirmed' and new.status in ('processing', 'cancelled')) or
    (old.status = 'processing' and new.status = 'dispatched') or
    (old.status = 'dispatched' and new.status = 'delivered');

  if not allowed_transition then
    raise exception 'Invalid order status transition: % -> %', old.status, new.status
      using errcode = '23514';
  end if;

  new.updated_at := now();

  insert into public.oc_order_events (order_id, actor_id, from_status, to_status)
  values (old.id, verified_actor, old.status, new.status);

  return new;
end;
$oc_guard$;

drop trigger if exists oc_orders_status_guard on public.oc_orders;
create trigger oc_orders_status_guard
before update of status on public.oc_orders
for each row
execute function public.oc_guard_order_status_change();



-- Record the initial pending state so the audit trail has a complete origin.
create or replace function public.oc_record_order_creation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $oc_created$
begin
  insert into public.oc_order_events (order_id, actor_id, from_status, to_status, note)
  values (new.id, 'system', null, new.status, 'Order created');
  return new;
end;
$oc_created$;

drop trigger if exists oc_orders_creation_event on public.oc_orders;
create trigger oc_orders_creation_event
after insert on public.oc_orders
for each row
execute function public.oc_record_order_creation();

-- IMPORTANT SECURITY CHECKLIST BEFORE USE:
-- 1. Confirm RLS and browser-role revocations above remain in place.
-- 2. Do not expose service-role credentials in the browser.
-- 3. Only server code with verified admin/customer authorization may access PII.
-- 4. Create orders in one transaction after reloading approved prices and
--    availability; recompute delivery and totals server-side.
-- 5. Generate high-entropy public references and tracking tokens; store only
--    a one-way hash of the tracking token.
-- 6. Enforce the idempotency_key on POST /api/orders to prevent duplicate orders.
-- 7. Add rate limiting, CSRF protection for cookie sessions, retention/deletion
--    controls and audited admin status transitions before applying this draft.
