import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/admin/auth.js";

function mockRes() {
  return {
    headers: {}, statusCode: null, body: null,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    status(n) { this.statusCode = n; return this; },
    end(body) { this.body = body; },
  };
}

async function withAuthEnv(fn) {
  const keys = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "ADMIN_EMAILS", "NODE_ENV"];
  const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, {
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_ANON_KEY: "test-public-key",
    ADMIN_EMAILS: "owner@example.com",
    NODE_ENV: "test",
  });
  const originalFetch = globalThis.fetch;
  try { await fn(); }
  finally {
    globalThis.fetch = originalFetch;
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

const sameOrigin = { origin: "https://shop.example", host: "shop.example", "x-forwarded-proto": "https" };

test("OTP request returns a generic response and does not send email to an unapproved address", async () => {
  await withAuthEnv(async () => {
    globalThis.fetch = async () => { throw new Error("Supabase should not be called"); };
    const res = mockRes();
    await handler({ method: "POST", headers: sameOrigin, body: { action: "request", email: "intruder@example.com" } }, res);
    assert.equal(res.statusCode, 200);
    assert.match(JSON.parse(res.body).message, /If this address is authorised/);
  });
});

test("OTP request sends a code only for an allowlisted email", async () => {
  await withAuthEnv(async () => {
    let sent = false;
    globalThis.fetch = async (url, options) => {
      sent = true;
      assert.equal(url, "https://project.supabase.co/auth/v1/otp");
      assert.deepEqual(JSON.parse(options.body), { email: "owner@example.com", create_user: false });
      return new Response("{}", { status: 200 });
    };
    const res = mockRes();
    await handler({ method: "POST", headers: sameOrigin, body: { action: "request", email: "OWNER@example.com" } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(sent, true);
  });
});

test("OTP verification creates an HttpOnly cookie and never returns access or refresh tokens", async () => {
  await withAuthEnv(async () => {
    globalThis.fetch = async url => {
      assert.equal(url, "https://project.supabase.co/auth/v1/verify");
      return new Response(JSON.stringify({
        access_token: "a".repeat(80),
        refresh_token: "must-not-leak",
        expires_in: 3600,
        user: { email: "owner@example.com" },
      }), { status: 200 });
    };
    const res = mockRes();
    await handler({ method: "POST", headers: sameOrigin, body: { action: "verify", email: "owner@example.com", token: "123456" } }, res);
    assert.equal(res.statusCode, 200);
    assert.match(res.headers["set-cookie"], /HttpOnly/);
    assert.match(res.headers["set-cookie"], /Secure/);
    assert.doesNotMatch(res.body, /access_token|refresh_token|must-not-leak/);
  });
});

test("logout revokes the current Supabase access token and clears the cookie", async () => {
  await withAuthEnv(async () => {
    let revoked = false;
    globalThis.fetch = async (url, options) => {
      assert.equal(url, "https://project.supabase.co/auth/v1/logout");
      assert.equal(options.headers.Authorization, "Bearer " + "a".repeat(80));
      revoked = true;
      return new Response(null, { status: 204 });
    };
    const res = mockRes();
    await handler({
      method: "POST", headers: { ...sameOrigin, cookie: "oc_admin_session=" + "a".repeat(80) },
      body: { action: "logout" },
    }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(revoked, true);
    assert.match(res.headers["set-cookie"], /Max-Age=0/);
  });
});

test("auth mutations reject missing and cross-origin Origin headers", async () => {
  await withAuthEnv(async () => {
    const res = mockRes();
    await handler({ method: "POST", headers: { host: "shop.example" }, body: { action: "request", email: "owner@example.com" } }, res);
    assert.equal(res.statusCode, 403);
  });
});
