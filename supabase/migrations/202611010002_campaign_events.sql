-- Basic campaign tracking: page views, add-to-cart, and WhatsApp clicks,
-- tagged with UTM parameters when present. This is the data behind "which
-- ads actually convert" — no dashboard yet, query it directly in the SQL
-- editor for now (see comment at the bottom).
--
-- No PII: session_id is a random, browser-generated value held only in
-- sessionStorage (cleared when the tab closes), not tied to any account,
-- email or phone number.

create table if not exists public.oc_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('page_view', 'add_to_cart', 'whatsapp_click')),
  path text check (path is null or length(path) <= 300),
  view text check (view is null or length(view) <= 300), -- a human label for product/collection views that have no real URL
  session_id text check (session_id is null or length(session_id) <= 100),
  referrer text check (referrer is null or length(referrer) <= 500),
  utm_source text check (utm_source is null or length(utm_source) <= 100),
  utm_medium text check (utm_medium is null or length(utm_medium) <= 100),
  utm_campaign text check (utm_campaign is null or length(utm_campaign) <= 150),
  utm_content text check (utm_content is null or length(utm_content) <= 150),
  utm_term text check (utm_term is null or length(utm_term) <= 150),
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists oc_events_created_at_idx on public.oc_events (created_at desc);
create index if not exists oc_events_type_idx on public.oc_events (event_type);
create index if not exists oc_events_campaign_idx on public.oc_events (utm_campaign) where utm_campaign is not null;

-- Same posture as every other table here: locked down by RLS, written only
-- by server code using the service-role key (api/track.js). No browser role
-- can read or write this table directly.
alter table public.oc_events enable row level security;
revoke all on table public.oc_events from public, anon, authenticated;

-- Example query to see which campaigns are driving traffic and add-to-carts
-- (run in the Supabase SQL editor):
--
--   select utm_campaign, utm_source, event_type, count(*)
--   from oc_events
--   where utm_campaign is not null
--   group by 1, 2, 3
--   order by 1, 3;
