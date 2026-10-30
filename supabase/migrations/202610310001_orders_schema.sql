-- Outback Cartel order system schema (PostgreSQL)
-- Draft migration only. Do not apply to production until credentials, RLS,
-- admin identity, retention policy and API validation are configured.

create extension if not exists pgcrypto;

create table if not exists public.oc_products (
  id text primary key,
  source text not null check (source in ('house', 'supplier')),
  supplier_id text,
  title text not null,
  price_bdt integer not null check (price_bdt >= 0),
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
  unique (product_id, size, colour)
);

create table if not exists public.oc_orders (
  id uuid primary key default gen_random_uuid(),
  public_reference text not null unique,
  lookup_token_hash text not null,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'confirmed', 'processing', 'dispatched', 'delivered', 'cancelled')),
  customer_name text not null,
  phone text not null,
  district text not null,
  area text,
  address text not null,
  delivery_zone text not null check (delivery_zone in ('inside', 'sub', 'outside')),
  subtotal_bdt integer not null check (subtotal_bdt >= 0),
  delivery_bdt integer not null check (delivery_bdt >= 0),
  total_bdt integer not null check (total_bdt = subtotal_bdt + delivery_bdt),
  payment_method text not null default 'cod' check (payment_method = 'cod'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.oc_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.oc_orders(id) on delete cascade,
  product_id text not null references public.oc_products(id),
  variant_id uuid references public.oc_product_variants(id),
  product_title_snapshot text not null,
  variant_snapshot jsonb not null default '{}'::jsonb,
  unit_price_bdt integer not null check (unit_price_bdt >= 0),
  quantity integer not null check (quantity between 1 and 99),
  line_total_bdt integer not null check (line_total_bdt = unit_price_bdt * quantity)
);

create table if not exists public.oc_order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.oc_orders(id) on delete cascade,
  actor_id text not null,
  from_status text,
  to_status text not null,
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

-- IMPORTANT SECURITY CHECKLIST BEFORE USE:
-- 1. Enable RLS on every table.
-- 2. Deny anonymous SELECT/INSERT/UPDATE/DELETE by default.
-- 3. Do not expose service-role credentials in the browser.
-- 4. Only server code with verified admin/customer authorization may access PII.
-- 5. Create orders in one transaction after reloading approved prices and
--    availability; recompute delivery and totals server-side.
-- 6. Hash random tracking tokens with a modern password hash; never store raw tokens.
-- 7. Add rate limiting, idempotency, CSRF protection for cookie sessions,
--    retention/deletion controls and audited admin status transitions.
