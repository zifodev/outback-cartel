import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isAdminAuthenticated } from "../api/_lib/admin-auth.js";

function withAdminPassword(password, fn) {
  const had = Object.hasOwn(process.env, "ADMIN_PASSWORD");
  const original = process.env.ADMIN_PASSWORD;
  if (password === undefined) delete process.env.ADMIN_PASSWORD;
  else process.env.ADMIN_PASSWORD = password;
  try {
    return fn();
  } finally {
    if (had) process.env.ADMIN_PASSWORD = original;
    else delete process.env.ADMIN_PASSWORD;
  }
}

test("accepts the correct password via the Authorization: Bearer header", () => {
  withAdminPassword("a-long-enough-admin-password", () => {
    assert.equal(isAdminAuthenticated({ headers: { authorization: "Bearer a-long-enough-admin-password" } }), true);
  });
});

test("accepts the correct password via the X-Admin-Password header", () => {
  withAdminPassword("a-long-enough-admin-password", () => {
    assert.equal(isAdminAuthenticated({ headers: { "x-admin-password": "a-long-enough-admin-password" } }), true);
  });
});

test("rejects a wrong password of the same length", () => {
  withAdminPassword("a-long-enough-admin-password", () => {
    assert.equal(isAdminAuthenticated({ headers: { authorization: "Bearer a-long-enough-admin-passworx" } }), false);
  });
});

test("rejects a wrong password of a different length", () => {
  withAdminPassword("a-long-enough-admin-password", () => {
    assert.equal(isAdminAuthenticated({ headers: { authorization: "Bearer short" } }), false);
    assert.equal(isAdminAuthenticated({ headers: { authorization: "Bearer way-way-way-too-long-to-be-the-password" } }), false);
  });
});

test("rejects every request when ADMIN_PASSWORD is not configured", () => {
  withAdminPassword(undefined, () => {
    assert.equal(isAdminAuthenticated({ headers: { authorization: "Bearer anything" } }), false);
  });
});

test("rejects every request when ADMIN_PASSWORD is suspiciously short", () => {
  withAdminPassword("short1234567", () => {
    // length 12 passes the >=12 gate...
    assert.equal(isAdminAuthenticated({ headers: { authorization: "Bearer short1234567" } }), true);
  });
  withAdminPassword("tooshort12", () => {
    // ...but length 10 does not, regardless of a matching guess.
    assert.equal(isAdminAuthenticated({ headers: { authorization: "Bearer tooshort12" } }), false);
  });
});

test("rejects requests with no credentials at all", () => {
  withAdminPassword("a-long-enough-admin-password", () => {
    assert.equal(isAdminAuthenticated({ headers: {} }), false);
  });
});

test("comparison takes the same time whether the wrong guess matches a short or long prefix of the real password (no early-exit timing leak)", () => {
  // This isn't a precise timing assertion (too flaky for CI) — it's a
  // structural check that the implementation hashes both sides first
  // (fixed-length buffers) rather than comparing the raw strings with ===,
  // which is what would let an attacker learn the password one byte at a
  // time from response timing. See admin-auth.js's module comment.
  const src = readFileSync(new URL("../api/_lib/admin-auth.js", import.meta.url), "utf8");
  assert.ok(/timingSafeEqual/.test(src), "must use a constant-time comparison");
  assert.ok(!/===\s*password|password\s*===/.test(src), "must not fall back to a plain === comparison against the password");
});
