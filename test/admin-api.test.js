import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/admin/orders.js";

function responseMock() {
  return {
    headers: {}, statusCode: null, body: null,
    setHeader(k,v) { this.headers[k.toLowerCase()] = v; },
    status(n) { this.statusCode = n; return this; },
    end(body) { this.body = body; },
  };
}

test("order status audit actor comes from the verified Supabase identity, never request JSON", async () => {
  const keys = ["SUPABASE_URL","SUPABASE_ANON_KEY","SUPABASE_SERVICE_ROLE_KEY","ADMIN_EMAILS"];
  const previous = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  Object.assign(process.env, {
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_ANON_KEY: "public-test-key",
    SUPABASE_SERVICE_ROLE_KEY: "server-only-test-service-role",
    ADMIN_EMAILS: "owner@example.com",
  });
  const originalFetch = globalThis.fetch;
  let rpcBody;
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).endsWith("/auth/v1/user")) {
      assert.equal(options.headers.Authorization, "Bearer " + "x".repeat(80));
      return new Response(JSON.stringify({ id: "admin-uuid", email: "owner@example.com" }), { status: 200 });
    }
    if (String(url).includes("/rest/v1/oc_orders?")) {
      return new Response(JSON.stringify([{ id: "order-1", status: "pending_review" }]), { status: 200 });
    }
    if (String(url).endsWith("/rest/v1/rpc/admin_update_order_status")) {
      rpcBody = JSON.parse(options.body);
      return new Response(JSON.stringify({ id: "order-1", status: "confirmed" }), { status: 200 });
    }
    throw new Error("Unexpected fetch: " + url);
  };
  try {
    const res = responseMock();
    await handler({
      method: "POST",
      headers: {
        cookie: "oc_admin_session=" + "x".repeat(80),
        origin: "https://shop.example",
        host: "shop.example",
      },
      body: { orderId: "order-1", newStatus: "confirmed", actorId: "attacker-selected" },
    }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(rpcBody.p_actor_id, "admin:owner@example.com");
    assert.notEqual(rpcBody.p_actor_id, "attacker-selected");
  } finally {
    globalThis.fetch = originalFetch;
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test("order mutations reject cross-origin requests before touching the database", async () => {
  const res = responseMock();
  await handler({
    method: "POST",
    headers: { origin: "https://evil.example", host: "shop.example" },
    body: { orderId: "order-1", newStatus: "confirmed" },
  }, res);
  assert.equal(res.statusCode, 403);
});
