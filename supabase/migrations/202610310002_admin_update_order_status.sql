-- Backfill — this migration has already been applied to the live database
-- (Supabase migration history: 20261031020906_add_admin_update_order_status_rpc,
-- applied right after 202610310001_orders_schema.sql) but was never
-- committed to this repo. api/admin/orders.js has been calling this
-- function since then. Without this file, a fresh database built from this
-- migrations folder — a new staging environment, a disaster-recovery
-- restore, a local dev database — would be missing it entirely, and the
-- order of commits here would not match the order these were actually
-- applied in (this one predates 202611010001_atomic_order_creation.sql).
--
-- Text below is exactly what is live (CREATE OR REPLACE is a no-op against
-- the running database), not a rewrite.
--
-- p_actor_id is free-text supplied by the caller and trusted as-is by the
-- oc_guard_order_status_change trigger for the immutable oc_order_events
-- audit trail. The database has no way to verify who the real caller is —
-- there is only one shared admin credential today, not per-admin accounts
-- — so api/admin/orders.js must never forward a client-supplied value here;
-- see that file for the fix that keeps this fixed/server-chosen.

-- RPC function for admin status updates.
-- Sets app.actor_id (required by the status guard trigger) then patches status.
-- Returns the updated row.
create or replace function public.admin_update_order_status(
  p_order_id uuid,
  p_new_status text,
  p_actor_id  text default 'admin'
)
returns setof public.oc_orders
language plpgsql
security definer          -- runs with owner privileges
set search_path = public  -- prevent search-path hijacking
as $$
begin
  perform set_config('app.actor_id', p_actor_id, true);

  update public.oc_orders
     set status = p_new_status
   where id = p_order_id;

  if not found then
    raise exception 'Order % not found', p_order_id
      using errcode = 'P0002';
  end if;

  return query select * from public.oc_orders where id = p_order_id;
end;
$$;

-- Only service role may call this.
revoke execute on function public.admin_update_order_status(uuid, text, text) from public;
revoke execute on function public.admin_update_order_status(uuid, text, text) from anon;
revoke execute on function public.admin_update_order_status(uuid, text, text) from authenticated;
