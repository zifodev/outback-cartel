# Development testing procedure

How to safely test the order schema migration without touching the live Supabase project.

## Prerequisites

- Node.js 18+ (for `node --test`)
- PostgreSQL 15+ running locally (for database integration tests)
- Git (you should be on `task-2-cloudflare-test`)
- The repo cloned locally

## What the tests cover

The test suite has three layers:

| Test file | What it checks | Needs DB? |
|-----------|----------------|-----------|
| `test/orders-api.test.js` | HTTP contract: method gate, idempotency key, body parsing | No |
| `test/orders-edge-cases.test.js` | Order security helpers and validation edge cases | No |
| `test/migration-schema.test.js` | Schema consistency: SQL constraints match JS constants | No |
| `test/migration-db.test.js` | Database integration: actual constraints, triggers, RLS | Yes |

### Schema consistency tests (no database required)

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

### Database integration tests (requires local PostgreSQL)

These tests connect to a local PostgreSQL database and verify:

- All 5 tables exist in the `public` schema
- RLS is enabled on every table
- `anon`, `authenticated` and `PUBLIC` have zero table and sequence privileges
- All expected indexes exist, including the partial catalogue index on `approved+active`
- All triggers exist and fire correctly:
  - **Status guard**: blocks transitions without `app.actor_id`, rejects invalid transitions
  - **Append-only events**: blocks UPDATE and DELETE on `oc_order_events`
  - **Creation event**: auto-inserts audit event on order INSERT
  - **updated_at**: advances timestamp on product UPDATE
- Check constraints reject invalid data:
  - Supplier consistency (house vs supplier products)
  - Zero/negative prices
  - Unknown supplier names
  - Mismatched totals
  - Wrong delivery fees for zone
  - Invalid SHA-256 patterns
  - Short idempotency keys, names, addresses
  - Non-COD payment methods
- Foreign key constraints work (product references, cascading deletes)
- Full order lifecycle: `pending_review -> confirmed -> processing -> dispatched -> delivered`
- Terminal states cannot transition further

## Running the tests

```bash
# Run all tests (unit + integration)
node --test

# Skip database tests when no local PostgreSQL is available
DB_SKIP=1 node --test
```

All tests use Node's built-in test runner — no external test framework needed.

Expected output: 142 tests pass with exit code 0.

## Local database setup

To run the database integration tests:

```bash
# 1. Create the test database and roles
sudo -u postgres createdb outback_test
sudo -u postgres psql -c "
  DO \$\$ BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
      CREATE ROLE anon NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
      CREATE ROLE authenticated NOLOGIN;
    END IF;
  END \$\$;
"

# 2. Apply the migration
sudo -u postgres psql -d outback_test \
  -f supabase/migrations/202610310001_orders_schema.sql

# 3. Set a password for TCP connections (if not already done)
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'localtest';"

# 4. Run the tests
node --test test/migration-db.test.js
```

The default connection string is:
`postgresql://postgres:localtest@127.0.0.1:5432/outback_test`

Override it with `TEST_DATABASE_URL` if your setup differs.

### Docker alternative

```bash
docker run -d --name oc-test-db \
  -e POSTGRES_PASSWORD=localtest \
  -e POSTGRES_DB=outback_test \
  -p 54322:5432 \
  postgres:16

# Wait for startup, then apply migration
psql postgresql://postgres:localtest@localhost:54322/outback_test \
  -f supabase/migrations/202610310001_orders_schema.sql

TEST_DATABASE_URL=postgresql://postgres:localtest@localhost:54322/outback_test \
  node --test test/migration-db.test.js
```

### Supabase CLI alternative (requires Docker Desktop)

```bash
supabase init        # if not already done
supabase start       # starts local PostgreSQL + Auth + etc.
supabase db reset    # applies all migrations to the local instance
```

**None of these options touch the live Supabase project.** The local instance is disposable.

## What NOT to do

1. **Do not run `supabase link`** — that connects to the hosted project.
2. **Do not run `supabase db push`** or `supabase migration up` against the live project.
3. **Do not use `mcp__Supabase__apply_migration`** — that applies directly to production.
4. **Do not connect to the Supabase database** with `psql` and paste the migration SQL.
5. **Do not merge into `main`** — all work stays on `task-2-cloudflare-test`.

## When it's safe to apply the migration

The migration is ready to apply only when **all** of these are true:

1. All tests pass (`node --test` exits 0), including database integration tests.
2. The pre-deployment checklist at the bottom of the migration file has been reviewed.
3. Product sync is built and tested — the `oc_order_items` FK to `oc_products` means products must exist before orders can reference them.
4. `loadTrustedCatalogue` field mapping has been verified against the live product feed.
5. Admin identity and authorization are configured (Phase 3 of the API plan).
6. Rate limiting and CSRF protection are in place.
7. A Supabase development branch (not production) is used for the first apply.
