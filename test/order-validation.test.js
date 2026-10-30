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
test("rejects unapproved, inactive and unavailable variants", () => {
  const validated = validateOrderPayload(payload());
  assert.equal(priceValidatedOrder(validated, new Map()).ok, false);
  assert.equal(priceValidatedOrder(validated, new Map([["hoodie-1", { ...catalogue.get("hoodie-1"), approved: false }]])).ok, false);
  assert.equal(priceValidatedOrder(validated, new Map([["hoodie-1", { ...catalogue.get("hoodie-1"), variants: [{ id: "large-black", available: false }] }]])).ok, false);
});
