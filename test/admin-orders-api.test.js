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
    try {
      return await fn();
    } finally {
      for (const [k, { had, value }] of Object.entries(saved)) {
        if (had) process.env[k] = value; else delete process.env[k];
      }
    }
  })();
}

test("rejects status updates without the admin password", async () => {
  await withEnv({ ADMIN_PASSWORD: "a-long-enough-admin-password" }, async () => {
    const res = makeRes();
    await handler({ method: "POST", headers: {}, body: {} }, res);
    assert.equal(res._status, 401);
  });
});

test("never forwards a client-supplied actorId to the audit trail — always records a fixed server identity", async () => {
  // There is only one shared ADMIN_PASSWORD today, not per-admin accounts,
  // so the actor recorded in the permanent oc_order_events audit trail must
  // never be whatever the request body claims — see api/admin/orders.js
  // and the admin_update_order_status migration for why.
  await withEnv({ ADMIN_PASSWORD: "a-long-enough-admin-password", SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key" }, async () => {
    const originalFetch = globalThis.fetch;
    let rpcBody = null;
    globalThis.fetch = async (url, options = {}) => {
      const href = String(url);
      if (href.includes("/rpc/admin_update_order_status")) {
        rpcBody = JSON.parse(options.body);
        return new Response(JSON.stringify([{ id: "order-1", status: "confirmed" }]), {
          status: 200, headers: { "Content-Type": "application/json" },
        });
      }
      // The pre-check lookup of the order's current status.
      return new Response(JSON.stringify([{ id: "order-1", status: "pending_review" }]), {
        status: 200, headers: { "Content-Type": "application/json" },
      });
    };
    try {
      const res = makeRes();
      await handler({
        method: "POST",
        headers: { authorization: "Bearer a-long-enough-admin-password" },
        body: { orderId: "order-1", newStatus: "confirmed", actorId: "attacker-chosen-name" },
      }, res);
      assert.equal(res._status, 200);
      assert.ok(rpcBody, "the RPC must have been called");
      assert.equal(rpcBody.p_actor_id, "admin", "a client-supplied actorId must never reach the audit trail");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
