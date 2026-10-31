# Development testing procedure

How to safely test the order schema migration without touching the live Supabase project.

## Prerequisites

- Node.js 18+ (for `node --test`)
- Git (you should be on `task-2-cloudflare-test`)
- The repo cloned locally

## What the tests cover

The test suite validates the migration **without running it against any database**. Tests read the SQL file as text and cross-check it against the JavaScript validation modules.

| Test file | What it checks |
|-----------|----------------|
| `test/orders-api.test.js` | HTTP contract: method gate, idempotency key, body parsing |
| `test/orders-edge-cases.test.js` | Order security helpers and validation edge cases |
| `test/migration-schema.test.js` | Schema consistency: SQL constraints match JS constants |

### Schema consistency tests verify

- All five tables are created with RLS enabled and privileges revoked
- Sequence privileges revoked from browser roles
- Status enum in SQL matches `ORDER_STATUSES` in `order-status.js`
- State machine transitions in the SQL trigger match `canTransitionOrderStatus()`
- Delivery fees and free-delivery threshold match `DELIVERY_FEES_BDT` / `FREE_DELIVERY_FROM_BDT`
- Product table has supplier consistency constraint, category, image_url
- Orders table has `consent_at`, total computation check, SHA-256 patterns
- All required triggers exist (status guard, append-only events, creation event, products updated_at)
- All required indexes exist, including the partial catalogue index
- Idempotency constraint and key length bounds match JS validation

## Running the tests

```bash
# From the repo root
node --test
```

All tests use Node's built-in test runner — no external test framework needed.

Expected output: all tests pass with exit code 0.

## What NOT to do

1. **Do not run `supabase db push`** or `supabase migration up` against the live project.
2. **Do not use `mcp__Supabase__apply_migration`** — that applies directly to production.
3. **Do not connect to the Supabase database** with `psql` and paste the migration SQL.
4. **Do not merge into `main`** — all work stays on `task-2-cloudflare-test`.

## When it's safe to apply the migration

The migration is ready to apply only when **all** of these are true:

1. All tests pass (`node --test` exits 0).
2. The pre-deployment checklist at the bottom of the migration file has been reviewed.
3. Product sync is built and tested — the `oc_order_items` FK to `oc_products` means products must exist before orders can reference them.
4. `loadTrustedCatalogue` field mapping has been verified against the live product feed.
5. Admin identity and authorization are configured (Phase 3 of the API plan).
6. Rate limiting and CSRF protection are in place.
7. A Supabase development branch (not production) is used for the first apply.

## Local database testing (future)

When you're ready to test against a real PostgreSQL instance:

```bash
# Option 1: Supabase CLI local stack (recommended)
supabase init        # if not already done
supabase start       # starts local PostgreSQL + Auth + etc.
supabase db reset    # applies all migrations to the local instance

# Option 2: Plain Docker PostgreSQL
docker run -d --name oc-test-db \
  -e POSTGRES_PASSWORD=testonly \
  -e POSTGRES_DB=outback_test \
  -p 54322:5432 \
  postgres:15

psql postgresql://postgres:testonly@localhost:54322/outback_test \
  -f supabase/migrations/202610310001_orders_schema.sql
```

Neither option touches the live Supabase project. The local instance is disposable.
