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
