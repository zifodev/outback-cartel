import { createHash, randomBytes, randomUUID } from "node:crypto";

// Generate opaque identifiers server-side. Never derive public references or
// customer lookup tokens from phone numbers, timestamps, or sequential IDs.
export function createOrderIdentifiers() {
  const lookupToken = randomBytes(32).toString("base64url");
  return {
    publicReference: `OC-${randomBytes(8).toString("hex").toUpperCase()}`,
    idempotencyKey: randomUUID(),
    lookupToken,
    lookupTokenHash: hashLookupToken(lookupToken),
  };
}

export function hashLookupToken(token) {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    throw new TypeError("A valid order lookup token is required.");
  }
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function isValidIdempotencyKey(value) {
  return typeof value === "string" && value.length >= 16 && value.length <= 200 &&
    /^[A-Za-z0-9._:-]+$/.test(value);
}

// Read exactly one Idempotency-Key header from a Node/Vercel-style headers
// object. Reject arrays or duplicate casing rather than guessing which value
// the proxy/client intended. Persistence and replay handling belong in the API.
export function readIdempotencyKey(headers) {
  if (!headers || typeof headers !== "object" || Array.isArray(headers)) return null;
  const matches = Object.entries(headers).filter(([name]) => name.toLowerCase() === "idempotency-key");
  if (matches.length !== 1) return null;
  const value = matches[0][1];
  return isValidIdempotencyKey(value) ? value : null;
}

// Fingerprint an already validated, normalized JSON request. Object key order
// is canonicalized; array order is preserved. Do not pass raw HTTP input here.
export function hashOrderRequest(value) {
  const ancestors = new Set();
  function canonicalize(input) {
    if (input === null || typeof input === "string" || typeof input === "boolean") return input;
    if (typeof input === "number") {
      if (!Number.isFinite(input)) throw new TypeError("Order request must contain finite numbers.");
      return input;
    }
    if (Array.isArray(input)) {
      if (ancestors.has(input)) throw new TypeError("Order request cannot contain circular data.");
      ancestors.add(input);
      const result = input.map(canonicalize);
      ancestors.delete(input);
      return result;
    }
    if (typeof input === "object" && Object.getPrototypeOf(input) === Object.prototype) {
      if (ancestors.has(input)) throw new TypeError("Order request cannot contain circular data.");
      ancestors.add(input);
      const result = {};
      for (const key of Object.keys(input).sort()) {
        const entry = input[key];
        if (entry === undefined || typeof entry === "function" || typeof entry === "symbol" || typeof entry === "bigint") {
          throw new TypeError("Order request must contain JSON-compatible values.");
        }
        result[key] = canonicalize(entry);
      }
      ancestors.delete(input);
      return result;
    }
    throw new TypeError("Order request must contain JSON-compatible values.");
  }
  const canonicalJson = JSON.stringify(canonicalize(value));
  return createHash("sha256").update(canonicalJson, "utf8").digest("hex");
}
