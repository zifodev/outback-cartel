import test from "node:test";
import assert from "node:assert/strict";

// The track handler is a Vercel serverless function expecting (req, res).
// It must never surface errors to the shopper, so it always responds
// quickly and quietly (204) rather than 4xx/5xx — these tests check that
// invariant along with the handful of real behaviours (OPTIONS, method
// allowlist, and silently doing nothing without a database configured,
// since no SUPABASE_SERVICE_ROLE_KEY is set in this test environment).

const { default: handler } = await import("../api/track.js");

function makeRes() {
  const res = {
    statusCode: null,
    _headers: {},
    _body: null,
    status(code) { res.statusCode = code; return res; },
    setHeader(k, v) { res._headers[k.toLowerCase()] = v; },
    end(body) { res._body = body || null; },
  };
  return res;
}

function makeReq(overrides = {}) {
  return {
    method: "POST",
    body: { eventType: "page_view", path: "/", sessionId: "test-session-1" },
    ...overrides,
  };
}

test("OPTIONS returns 204 with Allow header", async () => {
  const res = makeRes();
  await handler(makeReq({ method: "OPTIONS" }), res);
  assert.equal(res.statusCode, 204);
  assert.ok(res._headers.allow.includes("POST"));
});

test("non-POST methods respond 204 (never surface an error to the shopper)", async () => {
  for (const method of ["GET", "PUT", "DELETE", "PATCH"]) {
    const res = makeRes();
    await handler(makeReq({ method }), res);
    assert.equal(res.statusCode, 204, `${method} should respond 204`);
  }
});

test("missing/invalid body responds 204 without throwing", async () => {
  for (const body of [null, undefined, "not an object", 42]) {
    const res = makeRes();
    await handler(makeReq({ body }), res);
    assert.equal(res.statusCode, 204);
  }
});

test("unrecognised eventType responds 204 without throwing", async () => {
  const res = makeRes();
  await handler(makeReq({ body: { eventType: "something_else" } }), res);
  assert.equal(res.statusCode, 204);
});

test("a well-formed page_view event responds 204 (no database configured in tests)", async () => {
  const res = makeRes();
  await handler(makeReq(), res);
  assert.equal(res.statusCode, 204);
});

test("an add_to_cart event with extra fields responds 204", async () => {
  const res = makeRes();
  await handler(makeReq({
    body: { eventType: "add_to_cart", productId: "hoodie-1", name: "Test Hoodie", price: 1199, sessionId: "s1" },
  }), res);
  assert.equal(res.statusCode, 204);
});

test("a whatsapp_click event responds 204", async () => {
  const res = makeRes();
  await handler(makeReq({
    body: { eventType: "whatsapp_click", href: "https://wa.me/8801881816245", sessionId: "s1" },
  }), res);
  assert.equal(res.statusCode, 204);
});
