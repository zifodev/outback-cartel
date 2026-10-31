-- Backfill — this migration has already been applied to the live database
-- (Supabase migration history: 20261031124653_allow_mobile_banking_payment_methods)
-- but was never committed to this repo. 202610310001_orders_schema.sql, as
-- committed, only allows payment_method = 'cod'; the checkout UI and
-- api/_lib/order-validation.js have offered bKash, Nagad and Rocket as
-- payment options since this was applied, so a fresh database built from
-- this folder without this file would reject every non-COD order with a
-- check-constraint violation — exactly the kind of "customer loses an
-- order" failure this review round is trying to rule out.
--
-- Text below is exactly what is live.

ALTER TABLE oc_orders DROP CONSTRAINT oc_orders_payment_method_check;
ALTER TABLE oc_orders ADD CONSTRAINT oc_orders_payment_method_check
  CHECK (payment_method = ANY (ARRAY['cod', 'bkash', 'nagad', 'rocket']));
