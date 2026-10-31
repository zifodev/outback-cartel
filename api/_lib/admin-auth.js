// Shared admin authentication for api/admin/*.js.
//
// Protected by the ADMIN_PASSWORD env var (a simple bearer token, not a
// per-user account system — there is only one admin password for now).
//
// Both the password and the value the caller sent are hashed to a fixed
// length before comparing, and compared with Node's constant-time
// timingSafeEqual instead of ===. A plain === comparison on strings of
// different lengths returns as soon as the lengths differ (or, for equal
// lengths, as soon as it hits the first different byte), so how long the
// check takes leaks information about how much of the guess was right —
// enough, over many requests, for an attacker to recover the password
// byte-by-byte. Hashing first also means timingSafeEqual (which requires
// equal-length buffers) never has to special-case a length mismatch.
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Returns true if `req` carries the correct admin password, either as
 * "Authorization: Bearer <password>" or "X-Admin-Password: <password>".
 * Always false if ADMIN_PASSWORD isn't configured or is suspiciously short.
 */
export function isAdminAuthenticated(req) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 12) return false;

  const auth = req.headers.authorization || "";
  const given = auth.startsWith("Bearer ") ? auth.slice(7) : req.headers["x-admin-password"];
  if (!given) return false;

  const a = createHash("sha256").update(password).digest();
  const b = createHash("sha256").update(String(given)).digest();
  return timingSafeEqual(a, b);
}
