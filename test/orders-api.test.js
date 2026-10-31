import test from "node:test";
import assert from "node:assert/strict";

// The orders handler is a Vercel serverless function expecting (req, res).
// We test it with minimal stubs that capture the response.

const { default: handler } = await import("../api/orders.js");

function makeRes() {
  const res = {
    _status: null,
    _headers: {},
    _body: null,
    status(code) { res._status = code; return res; },
    setHeader(k, v) { res._headers[k.toLowerCase()] = v; },
    end(body) { res._body = body ? JSON.parse(body) : null; },
  };
  return res;
}

function makeReq(overrides = {}) {
  return {
    method: "POST",
    headers: { "idempotency-key": "test-idempotency-key-0001" },
    body: {
      deliveryZone: "inside",
      paymentMethod: "cod",
      customer: { name: "Test Buyer", phone: "+8801712345678", district: "Dhaka", area: "Dhanmondi", address: "Road 4, House 10" },
      items: [{ productId: "hoodie-1", variantId: "large-black", quantity: 1 }],
    },
    ...overrides,
  };
}

test("rejects non-POST methods with 405", async () => {
  for (const method of ["GET", "PUT", "DELETE", "PATCH"]) {
    const res = makeRes();
    await handler(makeReq({ method }), res);
    assert.equal(res._status, 405, `${method} should be rejected`);
    assert.ok(res._headers.allow.includes("POST"));
  }
});

test("OPTIONS returns 204 with Allow header", async () => {
  const res = makeRes();
  await handler(makeReq({ method: "OPTIONS" }), res);
  assert.equal(res._status, 204);
  assert.ok(res._headers.allow.includes("POST"));
});

test("rejects missing Idempotency-Key header", async () => {
  const res = makeRes();
  await handler(makeReq({ headers: {} }), res);
  assert.equal(res._status, 400);
  assert.ok(res._body.error.includes("Idempotency-Key"));
});

test("rejects too-short Idempotency-Key", async () => {
  const res = makeRes();
  await handler(makeReq({ headers: { "idempotency-key": "short" } }), res);
  assert.equal(res._status, 400);
  assert.ok(res._body.error.includes("Idempotency-Key"));
});

test("rejects null/missing request body", async () => {
  const res = makeRes();
  await handler(makeReq({ body: null }), res);
  assert.equal(res._status, 400);
});

test("rejects invalid order payload (empty items)", async () => {
  const res = makeRes();
  await handler(makeReq({ body: { ...makeReq().body, items: [] } }), res);
  assert.equal(res._status, 400);
});

test("rejects invalid delivery zone", async () => {
  const res = makeRes();
  await handler(makeReq({ body: { ...makeReq().body, deliveryZone: "free" } }), res);
  assert.equal(res._status, 400);
});

// Note: The full validation+pricing test requires the products feed to be
// reachable, which needs real/stubbed supplier data. The unit tests in
// order-validation.test.js and order-security.test.js cover that logic.
// These tests verify the HTTP contract of the endpoint itself.
