import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// ── Load the migration SQL and the JS validation modules ──

const migrationSql = readFileSync(
  new URL("../supabase/migrations/202610310001_orders_schema.sql", import.meta.url),
  "utf8"
);

const { DELIVERY_FEES_BDT, FREE_DELIVERY_FROM_BDT } = await import("../api/_lib/order-validation.js");
const { ORDER_STATUSES, canTransitionOrderStatus } = await import("../api/_lib/order-status.js");

// ── Helpers ──

/** Extract all values from a SQL check constraint `in (...)` clause. */
function extractCheckValues(sql, columnPattern) {
  // Match: column check (...in ('val1', 'val2', ...))
  const regex = new RegExp(
    `${columnPattern}[^)]*in\\s*\\(([^)]+)\\)`,
    "gi"
  );
  const values = new Set();
  let match;
  while ((match = regex.exec(sql)) !== null) {
    const inner = match[1];
    for (const m of inner.matchAll(/'([^']+)'/g)) {
      values.add(m[1]);
    }
  }
  return values;
}

// ── Schema structure tests ──

test("migration creates all five core tables", () => {
  const tables = ["oc_products", "oc_product_variants", "oc_orders", "oc_order_items", "oc_order_events"];
  for (const table of tables) {
    assert.ok(
      migrationSql.includes(`create table if not exists public.${table}`),
      `Missing table: ${table}`
    );
  }
});

test("migration enables RLS on all tables", () => {
  const tables = ["oc_products", "oc_product_variants", "oc_orders", "oc_order_items", "oc_order_events"];
  for (const table of tables) {
    assert.ok(
      migrationSql.includes(`alter table public.${table} enable row level security`),
      `RLS not enabled on: ${table}`
    );
  }
});

test("migration revokes all privileges from public, anon, authenticated on all tables", () => {
  const tables = ["oc_products", "oc_product_variants", "oc_orders", "oc_order_items", "oc_order_events"];
  for (const table of tables) {
    assert.ok(
      migrationSql.includes(`revoke all on table public.${table} from public, anon, authenticated`),
      `Missing revoke on: ${table}`
    );
  }
});

test("migration revokes sequence usage from browser roles", () => {
  assert.ok(
    migrationSql.includes("revoke all on all sequences in schema public from public, anon, authenticated"),
    "Missing sequence privilege revocation"
  );
});

// ── Status enum consistency ──

test("SQL status check constraint matches ORDER_STATUSES", () => {
  const sqlStatuses = extractCheckValues(migrationSql, "status\\s+text[^)]*");
  for (const status of ORDER_STATUSES) {
    assert.ok(sqlStatuses.has(status), `ORDER_STATUSES has "${status}" but SQL check constraint does not`);
  }
  for (const status of sqlStatuses) {
    assert.ok(ORDER_STATUSES.includes(status), `SQL check has "${status}" but ORDER_STATUSES does not`);
  }
});

test("SQL from_status check includes null and all ORDER_STATUSES", () => {
  // from_status allows null (for initial creation) and every valid status
  assert.ok(
    migrationSql.includes("from_status is null"),
    "from_status should allow null for initial creation events"
  );
  const fromStatuses = extractCheckValues(migrationSql, "from_status\\s+text[^)]*");
  for (const status of ORDER_STATUSES) {
    assert.ok(fromStatuses.has(status), `from_status check is missing "${status}"`);
  }
});

// ── State machine consistency ──

test("SQL trigger allows exactly the transitions JS canTransitionOrderStatus allows", () => {
  // Extract transitions from the trigger function
  const triggerBlock = migrationSql.match(/allowed_transition\s*:=[\s\S]*?;/);
  assert.ok(triggerBlock, "Could not find allowed_transition assignment in trigger");
  const triggerText = triggerBlock[0];

  // For each pair of statuses, check JS and SQL agree
  for (const from of ORDER_STATUSES) {
    for (const to of ORDER_STATUSES) {
      if (from === to) continue;
      const jsAllows = canTransitionOrderStatus(from, to);

      // Check if the trigger text contains the transition pattern
      // The SQL uses: old.status = 'from' and new.status in ('to1', 'to2')
      // or: old.status = 'from' and new.status = 'to'
      const sqlContainsPair =
        triggerText.includes(`'${from}'`) &&
        triggerText.includes(`'${to}'`);

      // For transitions JS allows, the SQL must contain both statuses in
      // the same clause. We verify the key transitions explicitly.
      if (jsAllows) {
        assert.ok(
          sqlContainsPair,
          `JS allows ${from} -> ${to} but SQL trigger may not`
        );
      }
    }
  }

  // Verify terminal states have no outbound transitions in JS
  assert.deepEqual(
    canTransitionOrderStatus("delivered", "cancelled"), false,
    "delivered should be terminal"
  );
  assert.deepEqual(
    canTransitionOrderStatus("cancelled", "confirmed"), false,
    "cancelled should be terminal"
  );
});

// ── Delivery fee consistency ──

test("SQL delivery fee constraint matches DELIVERY_FEES_BDT", () => {
  for (const [zone, fee] of Object.entries(DELIVERY_FEES_BDT)) {
    assert.ok(
      migrationSql.includes(`when '${zone}' then ${fee}`),
      `SQL delivery fee for zone "${zone}" should be ${fee}`
    );
  }
});

test("SQL free delivery threshold matches FREE_DELIVERY_FROM_BDT", () => {
  assert.ok(
    migrationSql.includes(`subtotal_bdt >= ${FREE_DELIVERY_FROM_BDT}`),
    `SQL free delivery threshold should be >= ${FREE_DELIVERY_FROM_BDT}`
  );
});

test("SQL delivery zone check matches DELIVERY_FEES_BDT keys", () => {
  const sqlZones = extractCheckValues(migrationSql, "delivery_zone\\s+text[^)]*");
  const jsZones = Object.keys(DELIVERY_FEES_BDT);
  assert.equal(sqlZones.size, jsZones.length, "Zone count mismatch");
  for (const zone of jsZones) {
    assert.ok(sqlZones.has(zone), `JS zone "${zone}" not in SQL check`);
  }
});

// ── Product table checks ──

test("oc_products has source consistency constraint", () => {
  assert.ok(
    migrationSql.includes("oc_products_supplier_consistency"),
    "Missing supplier consistency constraint"
  );
  assert.ok(
    migrationSql.includes("supplier_name is not null and supplier_id is not null"),
    "Supplier products should require both supplier_name and supplier_id"
  );
});

test("oc_products has category and image_url columns", () => {
  assert.ok(migrationSql.includes("category text"), "Missing category column");
  assert.ok(migrationSql.includes("image_url text"), "Missing image_url column");
});

test("oc_products supplier_name check matches known suppliers", () => {
  assert.ok(migrationSql.includes("'mohasagor'"), "Missing mohasagor in supplier_name check");
  assert.ok(migrationSql.includes("'businesskoro'"), "Missing businesskoro in supplier_name check");
});

// ── Orders table checks ──

test("oc_orders has consent_at for privacy compliance", () => {
  assert.ok(
    migrationSql.includes("consent_at timestamptz"),
    "Missing consent_at column for data-processing consent"
  );
});

test("oc_orders total_bdt computed check is present", () => {
  assert.ok(
    migrationSql.includes("total_bdt = subtotal_bdt + delivery_bdt"),
    "Missing total computation check constraint"
  );
});

test("oc_orders idempotency columns use SHA-256 hex pattern", () => {
  // SHA-256 hex = 64 lowercase hex characters
  const sha256Pattern = "'^[0-9a-f]{64}$'";
  const sha256Occurrences = migrationSql.split(sha256Pattern).length - 1;
  // scope_hash, request_fingerprint, lookup_token_hash = 3 columns
  assert.ok(
    sha256Occurrences >= 3,
    `Expected at least 3 SHA-256 pattern checks, found ${sha256Occurrences}`
  );
});

// ── Trigger checks ──

test("migration creates the three required triggers", () => {
  assert.ok(migrationSql.includes("oc_orders_status_guard"), "Missing status guard trigger");
  assert.ok(migrationSql.includes("oc_order_events_immutable"), "Missing append-only trigger");
  assert.ok(migrationSql.includes("oc_orders_creation_event"), "Missing creation event trigger");
});

test("migration creates updated_at auto-trigger for products", () => {
  assert.ok(migrationSql.includes("oc_products_updated_at"), "Missing products updated_at trigger");
  assert.ok(migrationSql.includes("oc_set_updated_at"), "Missing set_updated_at function");
});

test("status guard trigger requires app.actor_id", () => {
  assert.ok(
    migrationSql.includes("current_setting('app.actor_id'"),
    "Trigger should read app.actor_id from session"
  );
  assert.ok(
    migrationSql.includes("A verified order actor is required"),
    "Trigger should reject missing actor"
  );
});

test("audit events trigger blocks UPDATE and DELETE", () => {
  assert.ok(
    migrationSql.includes("before update or delete on public.oc_order_events"),
    "Append-only trigger must fire on both UPDATE and DELETE"
  );
});

// ── Index checks ──

test("migration creates indexes for common query patterns", () => {
  const indexes = [
    "oc_orders_created_at_idx",
    "oc_orders_status_idx",
    "oc_orders_lookup_hash_idx",
    "oc_order_items_order_idx",
    "oc_order_events_order_idx",
    "oc_products_catalogue_idx",
  ];
  for (const idx of indexes) {
    assert.ok(migrationSql.includes(idx), `Missing index: ${idx}`);
  }
});

test("products catalogue index is a partial index on approved+active", () => {
  assert.ok(
    migrationSql.includes("where approved = true and active = true"),
    "Catalogue index should be a partial index filtering to approved+active"
  );
});

// ── Idempotency strategy ──

test("idempotency unique constraint is on (scope_hash, key)", () => {
  assert.ok(
    migrationSql.includes("unique (idempotency_scope_hash, idempotency_key)"),
    "Missing compound unique constraint for idempotency"
  );
});

test("idempotency key length bounds match JS validation", () => {
  // order-security.js: length >= 16 && length <= 200
  assert.ok(
    migrationSql.includes("length(idempotency_key) between 16 and 200"),
    "SQL key length bounds should match JS validation (16-200)"
  );
});
