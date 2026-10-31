import test from "node:test";
import assert from "node:assert/strict";
import {
  adminEmails,
  clearAdminSessionCookie,
  getAdminSession,
  isAllowedAdminEmail,
  isSameOriginRequest,
  requestAdminOtp,
  setAdminSessionCookie,
  verifyAdminOtp,
} from "../api/_lib/admin-auth.js";

const env = {
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_ANON_KEY: "test-publishable-key",
  ADMIN_EMAILS: "owner@example.com, manager@example.com",
};

function mockFetch(handler) {
  const original = globalThis.fetch;
  globalThis.fetch = handler;
  return () => { globalThis.fetch = original; };
}

function mockRes() {
  return {
    headers: {},
    statusCode: null,
    body: null,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    status(n) { this.statusCode = n; return this; },
    end(body) { this.body = body; },
  };
}

test("admin allowlist normalises case and whitespace", () => {
  assert.deepEqual(adminEmails(env), ["owner@example.com", "manager@example.com"]);
  assert.equal(isAllowedAdminEmail(" OWNER@example.com ", env), true);
  assert.equal(isAllowedAdminEmail("attacker@example.com", env), false);
  assert.equal(isAllowedAdminEmail("owner@example.com", {}), false);
});

test("OTP request uses Supabase Auth and disables automatic user creation", async () => {
  let called = false;
  const restore = mockFetch(async (url, options) => {
    called = true;
    assert.equal(url, "https://project.supabase.co/auth/v1/otp");
    assert.equal(options.method, "POST");
    assert.equal(options.headers.apikey, env.SUPABASE_ANON_KEY);
    assert.deepEqual(JSON.parse(options.body), { email: "owner@example.com", create_user: false });
    return new Response("{}", { status: 200 });
  });
  try {
    assert.deepEqual(await requestAdminOtp("OWNER@example.com", env), { accepted: true });
    assert.equal(called, true);
  } finally { restore(); }
});

test("OTP request does not disclose or send codes to non-allowlisted emails", async () => {
  const restore = mockFetch(async () => { throw new Error("must not call Supabase"); });
  try {
    assert.deepEqual(await requestAdminOtp("attacker@example.com", env), { accepted: true });
  } finally { restore(); }
});

test("OTP verification only accepts six digits and allowlisted identities", async () => {
  const restore = mockFetch(async () => { throw new Error("must not call Supabase"); });
  try {
    assert.equal(await verifyAdminOtp("attacker@example.com", "123456", env), null);
    assert.equal(await verifyAdminOtp("owner@example.com", "abc123", env), null);
  } finally { restore(); }
});

test("OTP verification returns only a short-lived access token and verified email", async () => {
  const restore = mockFetch(async (url, options) => {
    assert.equal(url, "https://project.supabase.co/auth/v1/verify");
    assert.deepEqual(JSON.parse(options.body), { email: "owner@example.com", token: "123456", type: "email" });
    return new Response(JSON.stringify({
      access_token: "a".repeat(80),
      refresh_token: "refresh-secret-must-not-be-returned",
      expires_in: 7200,
      user: { id: "user-1", email: "OWNER@example.com" },
    }), { status: 200 });
  });
  try {
    const result = await verifyAdminOtp("owner@example.com", "123456", env);
    assert.deepEqual(result, { accessToken: "a".repeat(80), email: "owner@example.com", expiresIn: 3600 });
    assert.equal("refreshToken" in result, false);
  } finally { restore(); }
});

test("OTP verification rejects a valid Supabase session for a non-allowlisted email", async () => {
  const restore = mockFetch(async () => new Response(JSON.stringify({
    access_token: "a".repeat(80), expires_in: 3600, user: { email: "other@example.com" },
  }), { status: 200 }));
  try { assert.equal(await verifyAdminOtp("owner@example.com", "123456", env), null); }
  finally { restore(); }
});

test("admin session validates the HttpOnly cookie against Supabase Auth", async () => {
  const restore = mockFetch(async (url, options) => {
    assert.equal(url, "https://project.supabase.co/auth/v1/user");
    assert.equal(options.headers.Authorization, "Bearer " + "a".repeat(80));
    return new Response(JSON.stringify({ id: "user-1", email: "OWNER@example.com" }), { status: 200 });
  });
  try {
    const session = await getAdminSession({ headers: { cookie: "other=x; oc_admin_session=" + "a".repeat(80) } }, env);
    assert.deepEqual(session, { id: "user-1", email: "owner@example.com" });
  } finally { restore(); }
});

test("admin session rejects missing, malformed and non-allowlisted cookies", async () => {
  const restore = mockFetch(async () => new Response(JSON.stringify({ id: "x", email: "intruder@example.com" }), { status: 200 }));
  try {
    assert.equal(await getAdminSession({ headers: {} }, env), null);
    assert.equal(await getAdminSession({ headers: { cookie: "oc_admin_session=bad" } }, env), null);
    assert.equal(await getAdminSession({ headers: { cookie: "oc_admin_session=" + "b".repeat(80) } }, env), null);
  } finally { restore(); }
});

test("session cookie is HttpOnly, Secure in HTTPS, SameSite Strict and scoped to admin API", () => {
  const res = mockRes();
  setAdminSessionCookie(res, { headers: { "x-forwarded-proto": "https" } }, { accessToken: "a".repeat(80), expiresIn: 3600 });
  const cookie = res.headers["set-cookie"];
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Path=\/api\/admin/);
  assert.match(cookie, /Max-Age=3600/);
  assert.doesNotMatch(cookie, /refresh/i);
});

test("logout cookie clears the same scoped HttpOnly session", () => {
  const res = mockRes();
  clearAdminSessionCookie(res, { headers: {} });
  assert.match(res.headers["set-cookie"], /Max-Age=0/);
  assert.match(res.headers["set-cookie"], /HttpOnly/);
  assert.match(res.headers["set-cookie"], /Path=\/api\/admin/);
});

test("mutating admin requests must have a matching same-origin Origin", () => {
  assert.equal(isSameOriginRequest({ headers: { origin: "https://shop.example", host: "shop.example" } }), true);
  assert.equal(isSameOriginRequest({ headers: { origin: "https://evil.example", host: "shop.example" } }), false);
  assert.equal(isSameOriginRequest({ headers: { host: "shop.example" } }), false);
});

test("admin page no longer stores credentials in web storage or submits a caller-chosen actor", async () => {
  const { readFile } = await import("node:fs/promises");
  const html = await readFile(new URL("../public/admin/index.html", import.meta.url), "utf8");
  assert.doesNotMatch(html, /sessionStorage|localStorage|oc_admin_pw|X-Admin-Password/);
  assert.doesNotMatch(html, /actorId\s*:/);
  assert.match(html, /autocomplete="one-time-code"/);
  assert.match(html, /credentials:"same-origin"/);
});
