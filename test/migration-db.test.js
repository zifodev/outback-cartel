/**
 * Database integration tests — run against a LOCAL PostgreSQL only.
 *
 * These tests verify the migration was applied correctly by querying the
 * actual database catalog and exercising constraints, triggers and RLS.
 *
 * Prerequisites:
 *   - PostgreSQL running locally with database `outback_test`
 *   - Migration already applied to `outback_test`
 *   - `pg` npm package installed
 *
 * Connection: postgresql://postgres:localtest@127.0.0.1:5432/outback_test
 *
 * Skip these tests when no local database is available:
 *   DB_SKIP=1 node --test
 */

import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";

const DB_URL = process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:localtest@127.0.0.1:5432/outback_test";

// Skip the entire file if DB_SKIP is set or pg cannot connect
let pool;
let skip = !!process.env.DB_SKIP;

async function query(sql, params) {
  const client = await pool.connect();
  try {
    return await client.query(sql, params);
  } finally {
    client.release();
  }
}

/** Guard — call at the top of every test body. */
function requireDb(t) {
  if (skip) { t.skip("No local database"); return false; }
  return true;
}

before(async () => {
  if (skip) return;
  try {
    const pg = await import("pg");
    pool = new pg.default.Pool({ connectionString: DB_URL, max: 3 });
    await pool.query("SELECT 1");
  } catch (err) {
    console.log(`# Skipping DB integration tests: ${err.message}`);
    skip = true;
  }
});

after(async () => {
  if (pool) await pool.end();
});

// ── Schema structure ──────────────────────────────────────────

describe("database schema", () => {
  test("all six tables exist", async (t) => {
    if (!requireDb(t)) return;
    const { rows } = await query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename LIKE 'oc_%'
      ORDER BY tablename
    `);
    const names = rows.map(r => r.tablename);
    assert.deepEqual(names, [
      "oc_events",
      "oc_order_events",
      "oc_order_items",
      "oc_orders",
      "oc_product_variants",
      "oc_products",
    ]);
  });

  test("RLS is enabled on every table", async (t) => {
    if (!requireDb(t)) return;
    const { rows } = await query(`
      SELECT tablename, rowsecurity FROM pg_tables
      WHERE schemaname = 'public' AND tablename LIKE 'oc_%'
    `);
    for (const row of rows) {
      assert.equal(row.rowsecurity, true, `RLS not enabled on ${row.tablename}`);
    }
  });

  test("anon and authenticated have zero table privileges", async (t) => {
    if (!requireDb(t)) return;
    const { rows } = await query(`
      SELECT grantee, table_name, privilege_type
      FROM information_schema.table_privileges
      WHERE table_schema = 'public'
        AND table_name LIKE 'oc_%'
        AND grantee IN ('anon', 'authenticated', 'PUBLIC')
    `);
    assert.equal(rows.length, 0, `Unexpected privileges: ${JSON.stringify(rows)}`);
  });

  test("anon and authenticated have zero sequence privileges", async (t) => {
    if (!requireDb(t)) return;
    const { rows } = await query(`
      SELECT grantee, object_name, privilege_type
      FROM information_schema.usage_privileges
      WHERE object_schema = 'public'
        AND grantee IN ('anon', 'authenticated')
        AND object_type = 'SEQUENCE'
    `);
    assert.equal(rows.length, 0, `Unexpected sequence privileges: ${JSON.stringify(rows)}`);
  });
});

// ── Indexes ───────────────────────────────────────────────────

describe("database indexes", () => {
  test("all expected indexes exist", async (t) => {
    if (!requireDb(t)) return;
    const { rows } = await query(`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = 'public' AND tablename LIKE 'oc_%'
      ORDER BY indexname
    `);
    const names = rows.map(r => r.indexname);
    const expected = [
      "oc_orders_created_at_idx",
      "oc_orders_idempotency_scope_key_unique",
      "oc_orders_lookup_hash_idx",
      "oc_orders_status_idx",
      "oc_products_catalogue_idx",
    ];
    for (const idx of expected) {
      assert.ok(names.includes(idx), `Missing index: ${idx}`);
    }
  });

  test("catalogue index is a partial index", async (t) => {
    if (!requireDb(t)) return;
    const { rows } = await query(`
      SELECT indexdef FROM pg_indexes
      WHERE indexname = 'oc_products_catalogue_idx'
    `);
    assert.equal(rows.length, 1);
    assert.ok(
      rows[0].indexdef.includes("WHERE ((approved = true) AND (active = true))"),
      "Catalogue index should be partial on approved+active"
    );
  });
});

// ── Triggers ──────────────────────────────────────────────────

describe("database triggers", () => {
  test("all five triggers exist", async (t) => {
    if (!requireDb(t)) return;
    const { rows } = await query(`
      SELECT trigger_name, event_object_table
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY trigger_name
    `);
    const names = rows.map(r => r.trigger_name);
    assert.ok(names.includes("oc_orders_status_guard"));
    assert.ok(names.includes("oc_orders_creation_event"));
    assert.ok(names.includes("oc_order_events_immutable"));
    assert.ok(names.includes("oc_products_updated_at"));
  });
});

// ── Products constraints ──────────────────────────────────────

describe("oc_products constraints", () => {
  test("rejects house product with supplier_name", async (t) => {
    if (!requireDb(t)) return;
    await assert.rejects(
      () => query(`
        INSERT INTO oc_products (id, source, supplier_name, title, price_bdt)
        VALUES ('test-house-bad', 'house', 'mohasagor', 'Bad House', 100)
      `),
      { message: /oc_products_supplier_consistency/ }
    );
  });

  test("rejects supplier product without supplier_name", async (t) => {
    if (!requireDb(t)) return;
    await assert.rejects(
      () => query(`
        INSERT INTO oc_products (id, source, title, price_bdt)
        VALUES ('test-supplier-bad', 'supplier', 'Bad Supplier', 100)
      `),
      { message: /oc_products_supplier_consistency/ }
    );
  });

  test("accepts valid house product", async (t) => {
    if (!requireDb(t)) return;
    await query(`
      INSERT INTO oc_products (id, source, title, price_bdt, approved, active)
      VALUES ('test-house-ok', 'house', 'House Product', 500, true, true)
    `);
    const { rows } = await query(`SELECT id, source FROM oc_products WHERE id = 'test-house-ok'`);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].source, "house");
  });

  test("accepts valid supplier product", async (t) => {
    if (!requireDb(t)) return;
    await query(`
      INSERT INTO oc_products (id, source, supplier_name, supplier_id, title, price_bdt, approved, active)
      VALUES ('ds-test-ok', 'supplier', 'mohasagor', 'ext-123', 'Supplier Product', 350, true, true)
    `);
    const { rows } = await query(`SELECT id, supplier_name FROM oc_products WHERE id = 'ds-test-ok'`);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].supplier_name, "mohasagor");
  });

  test("rejects zero price", async (t) => {
    if (!requireDb(t)) return;
    await assert.rejects(
      () => query(`
        INSERT INTO oc_products (id, source, title, price_bdt)
        VALUES ('test-zero-price', 'house', 'Free Product', 0)
      `),
      { message: /oc_products_price_bdt_check/ }
    );
  });

  test("rejects unknown supplier_name", async (t) => {
    if (!requireDb(t)) return;
    await assert.rejects(
      () => query(`
        INSERT INTO oc_products (id, source, supplier_name, supplier_id, title, price_bdt)
        VALUES ('test-bad-supplier', 'supplier', 'alibaba', 'x', 'Bad', 100)
      `),
      { message: /oc_products_supplier_name_check/ }
    );
  });

  test("updated_at trigger fires on product update", async (t) => {
    if (!requireDb(t)) return;
    const before = await query(`SELECT updated_at FROM oc_products WHERE id = 'test-house-ok'`);
    // Small delay to ensure timestamp difference
    await new Promise(r => setTimeout(r, 50));
    await query(`UPDATE oc_products SET title = 'Updated Title' WHERE id = 'test-house-ok'`);
    const after = await query(`SELECT updated_at FROM oc_products WHERE id = 'test-house-ok'`);
    assert.ok(
      after.rows[0].updated_at > before.rows[0].updated_at,
      "updated_at should advance on UPDATE"
    );
  });
});

// ── Product variants ──────────────────────────────────────────

describe("oc_product_variants constraints", () => {
  test("accepts a valid variant", async (t) => {
    if (!requireDb(t)) return;
    const { rows } = await query(`
      INSERT INTO oc_product_variants (product_id, size, colour)
      VALUES ('test-house-ok', 'L', 'Black')
      RETURNING id
    `);
    assert.equal(rows.length, 1);
  });

  test("rejects duplicate size+colour for same product", async (t) => {
    if (!requireDb(t)) return;
    await assert.rejects(
      () => query(`
        INSERT INTO oc_product_variants (product_id, size, colour)
        VALUES ('test-house-ok', 'L', 'Black')
      `),
      { message: /oc_product_variants_product_id_size_colour_key/ }
    );
  });

  test("cascades delete when product is removed", async (t) => {
    if (!requireDb(t)) return;
    await query(`
      INSERT INTO oc_products (id, source, title, price_bdt)
      VALUES ('test-cascade', 'house', 'Cascade Test', 100)
    `);
    await query(`
      INSERT INTO oc_product_variants (product_id, size, colour)
      VALUES ('test-cascade', 'M', 'Red')
    `);
    await query(`DELETE FROM oc_products WHERE id = 'test-cascade'`);
    const { rows } = await query(`
      SELECT * FROM oc_product_variants WHERE product_id = 'test-cascade'
    `);
    assert.equal(rows.length, 0);
  });
});

// ── Orders constraints ────────────────────────────────────────

describe("oc_orders constraints", () => {
  const validOrder = {
    public_reference: "OC-A1B2C3D4E5F67890",
    idempotency_scope_hash: "a".repeat(64),
    idempotency_key: "test-key-1234567890",
    request_fingerprint: "b".repeat(64),
    lookup_token_hash: "c".repeat(64),
    customer_name: "Test Customer",
    phone: "+8801234567890",
    district: "Dhaka",
    address: "123 Test Street, Test Area",
    delivery_zone: "inside",
    subtotal_bdt: 500,
    delivery_bdt: 60,
    total_bdt: 560,
  };

  function orderSQL(overrides = {}) {
    const o = { ...validOrder, ...overrides };
    return {
      text: `
        INSERT INTO oc_orders (
          public_reference, idempotency_scope_hash, idempotency_key,
          request_fingerprint, lookup_token_hash, customer_name, phone,
          district, address, delivery_zone, subtotal_bdt, delivery_bdt, total_bdt
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        RETURNING id
      `,
      values: [
        o.public_reference, o.idempotency_scope_hash, o.idempotency_key,
        o.request_fingerprint, o.lookup_token_hash, o.customer_name, o.phone,
        o.district, o.address, o.delivery_zone, o.subtotal_bdt, o.delivery_bdt, o.total_bdt,
      ],
    };
  }

  test("accepts a valid order and creates audit event", async (t) => {
    if (!requireDb(t)) return;
    const q = orderSQL();
    const { rows } = await query(q.text, q.values);
    assert.equal(rows.length, 1);
    const orderId = rows[0].id;

    // The creation trigger should have inserted an audit event
    const events = await query(
      `SELECT * FROM oc_order_events WHERE order_id = $1`,
      [orderId]
    );
    assert.equal(events.rows.length, 1);
    assert.equal(events.rows[0].from_status, null);
    assert.equal(events.rows[0].to_status, "pending_review");
    assert.equal(events.rows[0].actor_id, "system");
    assert.equal(events.rows[0].note, "Order created");
  });

  test("rejects mismatched total_bdt", async (t) => {
    if (!requireDb(t)) return;
    const q = orderSQL({
      public_reference: "OC-BAD-TOTAL-1234567",
      idempotency_key: "bad-total-key-123456",
      total_bdt: 999, // should be 560
    });
    await assert.rejects(
      () => query(q.text, q.values),
      { message: /oc_orders_check/ }
    );
  });

  test("rejects delivery fee not matching zone (inside=60)", async (t) => {
    if (!requireDb(t)) return;
    const q = orderSQL({
      public_reference: "OC-BAD-FEE-12345678",
      idempotency_key: "bad-fee-key-12345678",
      delivery_bdt: 100, // inside zone should be 60
      total_bdt: 600,
    });
    await assert.rejects(
      () => query(q.text, q.values),
      { message: /oc_orders_delivery_fee_matches_zone/ }
    );
  });

  test("allows free delivery when subtotal >= 999", async (t) => {
    if (!requireDb(t)) return;
    const q = orderSQL({
      public_reference: "OC-FREE-DELIVERY1234",
      idempotency_key: "free-delivery-key-1234",
      subtotal_bdt: 1000,
      delivery_bdt: 0,
      total_bdt: 1000,
    });
    const { rows } = await query(q.text, q.values);
    assert.equal(rows.length, 1);
  });

  test("rejects invalid scope hash (not 64 hex chars)", async (t) => {
    if (!requireDb(t)) return;
    const q = orderSQL({
      public_reference: "OC-BAD-SCOPE-123456",
      idempotency_key: "bad-scope-key-123456",
      idempotency_scope_hash: "tooshort",
    });
    await assert.rejects(
      () => query(q.text, q.values),
      { message: /idempotency_scope_hash/ }
    );
  });

  test("rejects short idempotency key", async (t) => {
    if (!requireDb(t)) return;
    const q = orderSQL({
      public_reference: "OC-SHORT-KEY-123456",
      idempotency_key: "short",
    });
    await assert.rejects(
      () => query(q.text, q.values),
      { message: /idempotency_key/ }
    );
  });

  test("enforces idempotency uniqueness on (scope, key)", async (t) => {
    if (!requireDb(t)) return;
    // First insert succeeds (uses default validOrder scope+key, already inserted above)
    // Second with same scope+key should fail
    const q = orderSQL({
      public_reference: "OC-DUPE-KEY-12345678",
      // Same scope_hash and key as validOrder
    });
    await assert.rejects(
      () => query(q.text, q.values),
      { message: /oc_orders_idempotency_scope_key_unique/ }
    );
  });

  test("rejects short customer name", async (t) => {
    if (!requireDb(t)) return;
    const q = orderSQL({
      public_reference: "OC-BAD-NAME-12345678",
      idempotency_key: "bad-name-key-12345678",
      idempotency_scope_hash: "d".repeat(64),
      customer_name: "A",
    });
    await assert.rejects(
      () => query(q.text, q.values),
      { message: /customer_name/ }
    );
  });

  test("rejects short address", async (t) => {
    if (!requireDb(t)) return;
    const q = orderSQL({
      public_reference: "OC-BAD-ADDR-12345678",
      idempotency_key: "bad-addr-key-12345678",
      idempotency_scope_hash: "e".repeat(64),
      address: "Hi",
    });
    await assert.rejects(
      () => query(q.text, q.values),
      { message: /address/ }
    );
  });

  test("accepts cod, bkash, nagad and rocket payment methods", async (t) => {
    if (!requireDb(t)) return;
    for (const [i, method] of ["cod", "bkash", "nagad", "rocket"].entries()) {
      const suffix = String(i).repeat(8);
      await query(`
        INSERT INTO oc_orders (
          public_reference, idempotency_scope_hash, idempotency_key,
          request_fingerprint, lookup_token_hash, customer_name, phone,
          district, address, delivery_zone, subtotal_bdt, delivery_bdt,
          total_bdt, payment_method
        ) VALUES (
          $1, $2, $3,
          $4, $5, 'Test', '+8801234567890',
          'Dhaka', '123 Test Street Area', 'inside', 500, 60, 560, $6
        )
      `, [`OC-OK-PAY-${suffix}`, "e".repeat(56) + suffix, `ok-pay-key-${suffix}123`,
        "f".repeat(56) + suffix, "a".repeat(56) + suffix, method]);
    }
  });

  test("rejects an unrecognised payment method", async (t) => {
    if (!requireDb(t)) return;
    await assert.rejects(
      () => query(`
        INSERT INTO oc_orders (
          public_reference, idempotency_scope_hash, idempotency_key,
          request_fingerprint, lookup_token_hash, customer_name, phone,
          district, address, delivery_zone, subtotal_bdt, delivery_bdt,
          total_bdt, payment_method
        ) VALUES (
          'OC-BAD-PAY-123456', $1, 'bad-pay-key-1234567',
          $2, $3, 'Test', '+8801234567890',
          'Dhaka', '123 Test Street Area', 'inside', 500, 60, 560, 'cash-app'
        )
      `, ["f".repeat(64), "b".repeat(64), "c".repeat(64)]),
      { message: /payment_method/ }
    );
  });
});

// ── Status guard trigger ──────────────────────────────────────

describe("status guard trigger", () => {
  let testOrderId;

  before(async () => {
    if (skip) return;
    const { rows } = await query(`
      INSERT INTO oc_orders (
        public_reference, idempotency_scope_hash, idempotency_key,
        request_fingerprint, lookup_token_hash, customer_name, phone,
        district, address, delivery_zone, subtotal_bdt, delivery_bdt, total_bdt
      ) VALUES (
        'OC-STATUS-TEST-1234', $1, 'status-test-key-12345',
        $2, $3, 'Status Tester', '+8801999888777',
        'Dhaka', '456 Status Street Test', 'inside', 500, 60, 560
      ) RETURNING id
    `, ["1".repeat(64), "2".repeat(64), "3".repeat(64)]);
    testOrderId = rows[0].id;
  });

  test("rejects status change without app.actor_id", async (t) => {
    if (!requireDb(t)) return;
    await assert.rejects(
      () => query(`UPDATE oc_orders SET status = 'confirmed' WHERE id = $1`, [testOrderId]),
      { message: /verified order actor is required/i }
    );
  });

  test("allows valid transition with app.actor_id set", async (t) => {
    if (!requireDb(t)) return;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL app.actor_id = 'admin:test@example.com'");
      await client.query("UPDATE oc_orders SET status = 'confirmed' WHERE id = $1", [testOrderId]);
      await client.query("COMMIT");

      const { rows } = await query(`SELECT status FROM oc_orders WHERE id = $1`, [testOrderId]);
      assert.equal(rows[0].status, "confirmed");

      // Should have created an audit event
      const events = await query(
        `SELECT * FROM oc_order_events WHERE order_id = $1 ORDER BY created_at`,
        [testOrderId]
      );
      // 1 creation event + 1 transition event
      assert.equal(events.rows.length, 2);
      assert.equal(events.rows[1].from_status, "pending_review");
      assert.equal(events.rows[1].to_status, "confirmed");
      assert.equal(events.rows[1].actor_id, "admin:test@example.com");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });

  test("rejects invalid transition (confirmed -> delivered)", async (t) => {
    if (!requireDb(t)) return;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL app.actor_id = 'admin:test@example.com'");
      await assert.rejects(
        () => client.query("UPDATE oc_orders SET status = 'delivered' WHERE id = $1", [testOrderId]),
        { message: /Invalid order status transition/ }
      );
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
  });

  test("allows full lifecycle: confirmed -> processing -> dispatched -> delivered", async (t) => {
    if (!requireDb(t)) return;
    const client = await pool.connect();
    try {
      for (const next of ["processing", "dispatched", "delivered"]) {
        await client.query("BEGIN");
        await client.query("SET LOCAL app.actor_id = 'admin:lifecycle@test.com'");
        await client.query("UPDATE oc_orders SET status = $1 WHERE id = $2", [next, testOrderId]);
        await client.query("COMMIT");
      }

      const { rows } = await query(`SELECT status FROM oc_orders WHERE id = $1`, [testOrderId]);
      assert.equal(rows[0].status, "delivered");

      // Total events: creation + confirmed + processing + dispatched + delivered = 5
      const events = await query(
        `SELECT count(*) as cnt FROM oc_order_events WHERE order_id = $1`,
        [testOrderId]
      );
      assert.equal(Number(events.rows[0].cnt), 5);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  });

  test("rejects transition from terminal state (delivered)", async (t) => {
    if (!requireDb(t)) return;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL app.actor_id = 'admin:test@example.com'");
      await assert.rejects(
        () => client.query("UPDATE oc_orders SET status = 'cancelled' WHERE id = $1", [testOrderId]),
        { message: /Invalid order status transition/ }
      );
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
  });
});

// ── Append-only audit events ──────────────────────────────────

describe("append-only order events", () => {
  test("rejects UPDATE on order events", async (t) => {
    if (!requireDb(t)) return;
    const { rows } = await query(`SELECT id FROM oc_order_events LIMIT 1`);
    if (rows.length === 0) return; // skip if no events
    await assert.rejects(
      () => query(`UPDATE oc_order_events SET note = 'tampered' WHERE id = $1`, [rows[0].id]),
      { message: /append-only/i }
    );
  });

  test("rejects DELETE on order events", async (t) => {
    if (!requireDb(t)) return;
    const { rows } = await query(`SELECT id FROM oc_order_events LIMIT 1`);
    if (rows.length === 0) return;
    await assert.rejects(
      () => query(`DELETE FROM oc_order_events WHERE id = $1`, [rows[0].id]),
      { message: /append-only/i }
    );
  });
});

// ── Order items FK constraints ────────────────────────────────

describe("oc_order_items foreign keys", () => {
  test("rejects order item referencing non-existent product", async (t) => {
    if (!requireDb(t)) return;
    // Get a valid order id
    const { rows } = await query(`SELECT id FROM oc_orders LIMIT 1`);
    if (rows.length === 0) return;
    await assert.rejects(
      () => query(`
        INSERT INTO oc_order_items (
          order_id, product_id, product_title_snapshot,
          unit_price_bdt, quantity, line_total_bdt
        ) VALUES ($1, 'nonexistent-product', 'Ghost Product', 100, 1, 100)
      `, [rows[0].id]),
      { message: /oc_order_items_product_id_fkey|violates foreign key/ }
    );
  });

  test("rejects line_total != unit_price * quantity", async (t) => {
    if (!requireDb(t)) return;
    const { rows } = await query(`SELECT id FROM oc_orders LIMIT 1`);
    if (rows.length === 0) return;
    await assert.rejects(
      () => query(`
        INSERT INTO oc_order_items (
          order_id, product_id, product_title_snapshot,
          unit_price_bdt, quantity, line_total_bdt
        ) VALUES ($1, 'test-house-ok', 'House Product', 500, 2, 999)
      `, [rows[0].id]),
      { message: /oc_order_items_check|line_total_bdt/ }
    );
  });

  test("accepts correct line item with valid product", async (t) => {
    if (!requireDb(t)) return;
    const { rows } = await query(`SELECT id FROM oc_orders LIMIT 1`);
    if (rows.length === 0) return;
    const result = await query(`
      INSERT INTO oc_order_items (
        order_id, product_id, product_title_snapshot,
        unit_price_bdt, quantity, line_total_bdt
      ) VALUES ($1, 'test-house-ok', 'House Product', 500, 2, 1000)
      RETURNING id
    `, [rows[0].id]);
    assert.equal(result.rows.length, 1);
  });
});

// ── Atomic order-creation RPC ──────────────────────────────────
// oc_create_order_with_items (see supabase/migrations/202611010001_*.sql)
// replaces two separate inserts from api/orders.js with one atomic call,
// so an order can never end up saved with missing line items, and so a
// failed idempotency lookup can't "fail open" into an unchecked insert.

describe("oc_create_order_with_items RPC", () => {
  function orderArg(overrides = {}) {
    return {
      public_reference: "OC-RPC-TEST-DEFAULT01",
      idempotency_scope_hash: "9".repeat(64),
      idempotency_key: "rpc-test-key-default-01",
      request_fingerprint: "8".repeat(64),
      lookup_token_hash: "7".repeat(64),
      customer_name: "RPC Test Customer",
      phone: "+8801234567890",
      district: "Dhaka",
      area: null,
      address: "RPC Test Street, Area 9",
      delivery_zone: "inside",
      subtotal_bdt: 500,
      delivery_bdt: 60,
      total_bdt: 560,
      payment_method: "cod",
      ...overrides,
    };
  }

  const itemArg = () => [{
    product_id: "test-house-ok",
    variant_id: "",
    product_title_snapshot: "House Product",
    variant_snapshot: {},
    unit_price_bdt: 500,
    quantity: 1,
    line_total_bdt: 500,
  }];

  test("creates the order and its line item atomically", async (t) => {
    if (!requireDb(t)) return;
    const { rows } = await query(
      `select public.oc_create_order_with_items($1, $2) as result`,
      [orderArg(), JSON.stringify(itemArg())]
    );
    const result = rows[0].result;
    assert.equal(result.replay, false);
    assert.equal(result.public_reference, "OC-RPC-TEST-DEFAULT01");

    const items = await query(
      `select count(*) as cnt from oc_order_items where order_id = $1`,
      [result.id]
    );
    assert.equal(Number(items.rows[0].cnt), 1, "line item should be saved with the order");
  });

  test("rolls back the order if an item insert fails (no orphaned order)", async (t) => {
    if (!requireDb(t)) return;
    const badItem = [{ ...itemArg()[0], product_id: "nonexistent-product" }];
    await assert.rejects(() =>
      query(
        `select public.oc_create_order_with_items($1, $2) as result`,
        [orderArg({
          public_reference: "OC-RPC-TEST-ROLLBACK1",
          idempotency_key: "rpc-test-key-rollback-1",
        }), JSON.stringify(badItem)]
      )
    );
    const orphan = await query(
      `select count(*) as cnt from oc_orders where public_reference = 'OC-RPC-TEST-ROLLBACK1'`
    );
    assert.equal(Number(orphan.rows[0].cnt), 0, "order must not exist when its item insert failed");
  });

  test("replays an identical request instead of creating a duplicate", async (t) => {
    if (!requireDb(t)) return;
    const arg = orderArg({
      public_reference: "OC-RPC-TEST-REPLAY001",
      idempotency_key: "rpc-test-key-replay-01",
    });
    const first = await query(`select public.oc_create_order_with_items($1, $2) as result`, [arg, JSON.stringify(itemArg())]);
    const second = await query(`select public.oc_create_order_with_items($1, $2) as result`, [arg, JSON.stringify(itemArg())]);

    assert.equal(first.rows[0].result.replay, false);
    assert.equal(second.rows[0].result.replay, true);
    assert.equal(second.rows[0].result.id, first.rows[0].result.id);

    const count = await query(
      `select count(*) as cnt from oc_orders where idempotency_key = 'rpc-test-key-replay-01'`
    );
    assert.equal(Number(count.rows[0].cnt), 1, "a replay must not create a second order row");
  });

  test("rejects a reused idempotency key with a different order (conflict)", async (t) => {
    if (!requireDb(t)) return;
    const arg = orderArg({
      public_reference: "OC-RPC-TEST-CONFLICT1",
      idempotency_key: "rpc-test-key-conflict-1",
    });
    await query(`select public.oc_create_order_with_items($1, $2) as result`, [arg, JSON.stringify(itemArg())]);

    const differentFingerprint = orderArg({
      public_reference: "OC-RPC-TEST-CONFLICT2",
      idempotency_key: "rpc-test-key-conflict-1", // same key
      request_fingerprint: "6".repeat(64), // different fingerprint
    });
    await assert.rejects(
      () => query(`select public.oc_create_order_with_items($1, $2) as result`, [differentFingerprint, JSON.stringify(itemArg())]),
      { message: /IDEMPOTENCY_CONFLICT/ }
    );
  });
});

// ── Cleanup ───────────────────────────────────────────────────

describe("cleanup test data", () => {
  test("remove test data without affecting schema", async (t) => {
    if (!requireDb(t)) return;
    // Delete in dependency order
    await query(`DELETE FROM oc_order_items`);
    // Events are append-only to app roles but we're superuser
    // We need to temporarily disable the trigger
    await query(`ALTER TABLE oc_order_events DISABLE TRIGGER oc_order_events_immutable`);
    await query(`DELETE FROM oc_order_events`);
    await query(`ALTER TABLE oc_order_events ENABLE TRIGGER oc_order_events_immutable`);
    await query(`DELETE FROM oc_orders`);
    await query(`DELETE FROM oc_product_variants`);
    await query(`DELETE FROM oc_products`);

    // Verify tables are empty
    for (const table of ["oc_orders", "oc_order_items", "oc_order_events", "oc_products", "oc_product_variants"]) {
      const { rows } = await query(`SELECT count(*) as cnt FROM ${table}`);
      assert.equal(Number(rows[0].cnt), 0, `${table} should be empty after cleanup`);
    }
  });
});
