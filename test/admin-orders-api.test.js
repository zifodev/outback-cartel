import test from "node:test";
import assert from "node:assert/strict";

const { default: handler } = await import("../api/admin/orders.js");

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

function withEnv(vars, fn) {
  const saved = {};
  for (const [k, v] of Object.entries(vars)) {
    saved[k] = { had: Object.hasOwn(process.env, k), value: process.env[k] };
    if (v === undefined) delete process.env[k]; else process.env[k] = v;
  }
  return (async () => {
    try { return await fn(); }
    finally {
      for (const [k, { had, value }] of Object.entries(saved)) {
        if (had) process.env[k] = value; else delete process.env[k];
      }
    }
  })();
}

const sameOrigin = { origin: "https://shop.example", host: "shop.example" };

test("rejects status updates without a verified Supabase admin session", async () => {
  await withEnv({ ADMIN_EMAILS: "owner@example.com", SUPABASE_ANON_KEY: "test-public-key" }, async () => {
    const res = makeRes();
    await handler({ method: "POST", headers: sameOrigin, body: {} }, res);
    assert.equal(res._status, 401);
  });
});

test("never forwards a client-supplied actorId — audit identity comes from verified Supabase user", async () => {
  await withEnv({
    ADMIN_EMAILS: "owner@example.com",
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_ANON_KEY: "test-public-key",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
  }, async () => {
    const originalFetch = globalThis.fetch;
    let rpcBody = null;
    globalThis.fetch = async (url, options = {}) => {
      const href = String(url);
      if (href.endsWith("/auth/v1/user")) {
        assert.equal(options.headers.Authorization, "Bearer " + "a".repeat(80));
        return new Response(JSON.stringify({ id: "admin-1", email: "owner@example.com" }), { status: 200 });
      }
      if (href.includes("/rpc/admin_update_order_status")) {
        rpcBody = JSON.parse(options.body);
        return new Response(JSON.stringify([{ id: "order-1", status: "confirmed" }]), { status: 200 });
      }
      return new Response(JSON.stringify([{ id: "order-1", status: "pending_review" }]), { status: 200 });
    };
    try {
      const res = makeRes();
      await handler({
        method: "POST",
        headers: { ...sameOrigin, cookie: "oc_admin_session=" + "a".repeat(80) },
        body: { orderId: "order-1", newStatus: "confirmed", actorId: "attacker-chosen-name" },
      }, res);
      assert.equal(res._status, 200);
      assert.ok(rpcBody, "the RPC must have been called");
      assert.equal(rpcBody.p_actor_id, "admin:owner@example.com");
      assert.notEqual(rpcBody.p_actor_id, "attacker-chosen-name");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
