import test from "node:test";
import assert from "node:assert/strict";
import { validateOrderPayload, priceValidatedOrder } from "../api/_lib/order-validation.js";

const payload = (overrides = {}) => ({
  deliveryZone: "inside",
  customer: { name: "Test Buyer", phone: "+8801712345678", district: "Dhaka", area: "Dhanmondi", address: "Road 4, House 10" },
  items: [{ productId: "hoodie-1", variantId: "large-black", quantity: 1 }],
  ...overrides,
});
const catalogue = new Map([["hoodie-1", {
  approved: true, active: true, priceBdt: 1199,
  variants: [{ id: "large-black", available: true }],
}]]);

test("rejects client-supplied price and malformed order structure", () => {
  assert.equal(validateOrderPayload({ ...payload(), total: 1 }).ok, true);
  assert.equal(validateOrderPayload({ ...payload(), items: [] }).ok, false);
  assert.equal(validateOrderPayload({ ...payload(), deliveryZone: "free" }).ok, false);
});
test("rejects invalid phone, address and quantities", () => {
  assert.equal(validateOrderPayload(payload({ customer: { ...payload().customer, phone: "123" } })).ok, false);
  assert.equal(validateOrderPayload(payload({ customer: { ...payload().customer, address: "x" } })).ok, false);
  assert.equal(validateOrderPayload(payload({ items: [{ productId: "hoodie-1", quantity: 1000 }] })).ok, false);
});
test("recomputes trusted price and delivery instead of trusting browser totals", () => {
  const validated = validateOrderPayload(payload());
  const priced = priceValidatedOrder(validated, catalogue);
  assert.equal(priced.ok, true);
  assert.equal(priced.value.subtotalBdt, 1199);
  assert.equal(priced.value.deliveryBdt, 0);
  assert.equal(priced.value.totalBdt, 1199);
});
test("charges the configured delivery fee below free-delivery threshold", () => {
  const validated = validateOrderPayload(payload({ items: [{ productId: "hoodie-1", variantId: "large-black", quantity: 1 }] }));
  const lowPrice = new Map([["hoodie-1", { ...catalogue.get("hoodie-1"), priceBdt: 500 }]]);
  const priced = priceValidatedOrder(validated, lowPrice);
  assert.equal(priced.value.deliveryBdt, 60);
  assert.equal(priced.value.totalBdt, 560);
});
test("requires a variant when the trusted product has variants", () => {
  const noVariant = validateOrderPayload(payload({ items: [{ productId: "hoodie-1", quantity: 1 }] }));
  assert.equal(priceValidatedOrder(noVariant, catalogue).ok, false);
});
test("rejects unapproved, inactive and unavailable variants", () => {
  const validated = validateOrderPayload(payload());
  assert.equal(priceValidatedOrder(validated, new Map()).ok, false);
  assert.equal(priceValidatedOrder(validated, new Map([["hoodie-1", { ...catalogue.get("hoodie-1"), approved: false }]])).ok, false);
  assert.equal(priceValidatedOrder(validated, new Map([["hoodie-1", { ...catalogue.get("hoodie-1"), variants: [{ id: "large-black", available: false }] }]])).ok, false);
});

test("combines repeated cart lines for the same product variant", () => {
  const result = validateOrderPayload(payload({
    items: [
      { productId: "hoodie-1", variantId: "large-black", quantity: 2 },
      { productId: "hoodie-1", variantId: "large-black", quantity: 3 },
    ],
  }));
  assert.equal(result.ok, true);
  assert.deepEqual(result.value.items, [
    { productId: "hoodie-1", variantId: "large-black", quantity: 5 },
  ]);
});
test("rejects combined repeated-line quantities above the limit", () => {
  const result = validateOrderPayload(payload({
    items: [
      { productId: "hoodie-1", variantId: "large-black", quantity: 60 },
      { productId: "hoodie-1", variantId: "large-black", quantity: 40 },
    ],
  }));
  assert.equal(result.ok, false);
});

test("applies each delivery-zone fee and the free-delivery threshold consistently", () => {
  const cases = [
    ["inside", 60],
    ["sub", 100],
    ["outside", 120],
  ];
  for (const [deliveryZone, expectedFee] of cases) {
    const validated = validateOrderPayload(payload({ deliveryZone }));
    const priced = priceValidatedOrder(validated, new Map([
      ["hoodie-1", { ...catalogue.get("hoodie-1"), priceBdt: 998 }],
    ]));
    assert.equal(priced.ok, true);
    assert.equal(priced.value.deliveryBdt, expectedFee);
  }
  const atThreshold = validateOrderPayload(payload());
  const free = priceValidatedOrder(atThreshold, new Map([
    ["hoodie-1", { ...catalogue.get("hoodie-1"), priceBdt: 999 }],
  ]));
  assert.equal(free.value.deliveryBdt, 0);
  assert.equal(free.value.totalBdt, 999);
});

test("rejects malformed customer and cart item objects", () => {
  assert.equal(validateOrderPayload(null).ok, false);
  assert.equal(validateOrderPayload(payload({ customer: [] })).ok, false);
  assert.equal(validateOrderPayload(payload({ items: [null] })).ok, false);
  assert.equal(validateOrderPayload(payload({ items: [{ productId: "hoodie-1", quantity: 1.5 }] })).ok, false);
  const blankVariant = validateOrderPayload(payload({ items: [{ productId: "hoodie-1", quantity: 1, variantId: " " }] }));
  assert.equal(blankVariant.ok, true);
  assert.equal(blankVariant.value.items[0].variantId, null);
});

test("rejects unsafe integer totals from the trusted catalogue", () => {
  const validated = validateOrderPayload(payload({ items: [{ productId: "hoodie-1", variantId: "large-black", quantity: 99 }] }));
  const hugePrice = new Map([
    ["hoodie-1", { ...catalogue.get("hoodie-1"), priceBdt: Number.MAX_SAFE_INTEGER }],
  ]);
  assert.equal(priceValidatedOrder(validated, hugePrice).ok, false);
});

test("draft order schema enables RLS and revokes browser-role table access", async () => {
  const { readFile } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");
  const schemaUrl = new URL("../supabase/migrations/202610310001_orders_schema.sql", import.meta.url);
  const sql = await readFile(fileURLToPath(schemaUrl), "utf8");
  for (const table of ["oc_products", "oc_product_variants", "oc_orders", "oc_order_items", "oc_order_events"]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security;`));
    assert.match(sql, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated;`));
  }
  assert.equal(sql.includes("foreign key (variant_id, product_id)") &&
    sql.includes("references public.oc_product_variants(id, product_id)"), true);
  assert.equal(sql.includes("price_bdt integer not null check (price_bdt > 0)"), true);
  assert.equal(sql.includes("idempotency_key text not null unique"), true);
  assert.equal(sql.includes("lookup_token_hash text not null check (length(lookup_token_hash) >= 32)"), true);
  assert.match(sql, /to_status text not null check/);
  assert.match(sql, /subtotal_bdt bigint not null/);
  assert.match(sql, /total_bdt bigint not null/);
  assert.match(sql, /line_total_bdt bigint not null/);
  assert.match(sql, /public_reference text not null unique check \(length\(public_reference\) between 8 and 64\)/);
  assert.match(sql, /idempotency_key text not null unique check \(length\(idempotency_key\) between 16 and 200\)/);
  assert.match(sql, /lookup_token_hash text not null check \(lookup_token_hash ~/);
  assert.match(sql, /customer_name text not null check/);
  assert.match(sql, /phone text not null check/);
  assert.match(sql, /constraint oc_orders_delivery_fee_matches_zone check/);
  assert.match(sql, /subtotal_bdt >= 999 and delivery_bdt = 0/);
});
