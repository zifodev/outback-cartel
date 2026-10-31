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

test("never returns a 200 'order placed' response when the database isn't configured", async () => {
  // The checkout UI (src/App.jsx CheckoutModal) treats any res.ok response
  // as a successful order: it shows the customer a reference number and a
  // WhatsApp-advance prompt. If SUPABASE_SERVICE_ROLE_KEY is missing, no row
  // is ever written, so a 200 here would be a false order confirmation —
  // this must fail loudly instead, the same way the admin endpoints already
  // do when the database isn't configured.
  const originalFetch = globalThis.fetch;
  const hadBusinessKoroKey = Object.hasOwn(process.env, "BUSINESSKORO_API_KEY");
  const originalBusinessKoroKey = process.env.BUSINESSKORO_API_KEY;
  const hadServiceRoleKey = Object.hasOwn(process.env, "SUPABASE_SERVICE_ROLE_KEY");
  const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  globalThis.fetch = async () => new Response(JSON.stringify({ data: [] }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
  // The handler reads process.env directly, not req.env, so the test
  // environment is set up (and restored) here rather than via makeReq().
  process.env.BUSINESSKORO_API_KEY = "test-key"; // just needs the feed call to succeed
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    const res = makeRes();
    // A house-brand item needs no supplier feed data, only a configured
    // supplier key so the feed call itself succeeds (empty supplier list).
    const req = makeReq({
      body: {
        ...makeReq().body,
        items: [{ productId: "hoodie-meow", variantId: "m-pink", quantity: 1 }],
      },
    });
    await handler(req, res);
    assert.equal(res._status, 503);
    assert.notEqual(res._status, 200);
    assert.ok(!res._body?.publicReference, "must not hand out an order reference for an order that was never saved");
  } finally {
    globalThis.fetch = originalFetch;
    if (hadBusinessKoroKey) process.env.BUSINESSKORO_API_KEY = originalBusinessKoroKey; else delete process.env.BUSINESSKORO_API_KEY;
    if (hadServiceRoleKey) process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey; else delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  }
});
