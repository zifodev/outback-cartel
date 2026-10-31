import test from "node:test";
import assert from "node:assert/strict";
import { createOrderIdentifiers, hashLookupToken, hashOrderRequest, hashIdempotencyScope, classifyIdempotencyRecord, isValidIdempotencyKey, readIdempotencyKey } from "../api/_lib/order-security.js";

test("creates opaque order identifiers with a high-entropy lookup token", () => {
  const ids = createOrderIdentifiers();
  assert.match(ids.publicReference, /^OC-[A-F0-9]{16}$/);
  assert.match(ids.idempotencyKey, /^[0-9a-f-]{36}$/);
  assert.match(ids.lookupToken, /^[A-Za-z0-9_-]{43}$/);
  assert.match(ids.lookupTokenHash, /^[0-9a-f]{64}$/);
  assert.equal(ids.lookupTokenHash, hashLookupToken(ids.lookupToken));
  assert.notEqual(ids.lookupTokenHash, ids.lookupToken);
});

test("generates independent identifiers for separate orders", () => {
  const first = createOrderIdentifiers();
  const second = createOrderIdentifiers();
  assert.notEqual(first.publicReference, second.publicReference);
  assert.notEqual(first.idempotencyKey, second.idempotencyKey);
  assert.notEqual(first.lookupToken, second.lookupToken);
});

test("rejects malformed lookup tokens before hashing", () => {
  for (const value of [null, "", "123", "x".repeat(44), "x".repeat(42)]) {
    assert.throws(() => hashLookupToken(value), TypeError);
  }
});

test("validates bounded idempotency keys", () => {
  assert.equal(isValidIdempotencyKey("client-request-12345"), true);
  assert.equal(isValidIdempotencyKey("x".repeat(16)), true);
  assert.equal(isValidIdempotencyKey("x".repeat(201)), false);
  assert.equal(isValidIdempotencyKey("short"), false);
  assert.equal(isValidIdempotencyKey("bad key with spaces"), false);
  assert.equal(isValidIdempotencyKey(null), false);
});


test("reads one valid Idempotency-Key header without guessing duplicates", () => {
  assert.equal(readIdempotencyKey({ "idempotency-key": "client-request-12345" }), "client-request-12345");
  assert.equal(readIdempotencyKey({ "Idempotency-Key": "client-request-12345" }), "client-request-12345");
  assert.equal(readIdempotencyKey({}), null);
  assert.equal(readIdempotencyKey(null), null);
  assert.equal(readIdempotencyKey({ "idempotency-key": ["client-request-12345"] }), null);
  assert.equal(readIdempotencyKey({ "idempotency-key": "short" }), null);
  assert.equal(readIdempotencyKey({ "idempotency-key": "client-request-12345", "Idempotency-Key": "client-request-67890" }), null);
});


test("fingerprints normalized request objects independent of object key order", () => {
  const first = { customer: { name: "A", phone: "123" }, items: [{ productId: "p1", quantity: 2 }] };
  const reordered = { items: [{ quantity: 2, productId: "p1" }], customer: { phone: "123", name: "A" } };
  assert.equal(hashOrderRequest(first), hashOrderRequest(reordered));
  assert.match(hashOrderRequest(first), /^[0-9a-f]{64}$/);
  assert.notEqual(hashOrderRequest(first), hashOrderRequest({ ...first, deliveryZone: "outside" }));
});

test("rejects non-JSON and circular order fingerprint input", () => {
  assert.throws(() => hashOrderRequest({ value: undefined }), TypeError);
  assert.throws(() => hashOrderRequest({ value: Number.NaN }), TypeError);
  const circular = {};
  circular.self = circular;
  assert.throws(() => hashOrderRequest(circular), TypeError);
});


test("hashes verified checkout scope identifiers without storing the raw identifier", () => {
  const scope = "server-verified-guest-session-123";
  const hash = hashIdempotencyScope(scope);
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.equal(hash, hashIdempotencyScope(scope));
  assert.notEqual(hash, scope);
  assert.notEqual(hash, hashIdempotencyScope("server-verified-guest-session-456"));
});

test("rejects missing, short, oversized and padded checkout scope identifiers", () => {
  for (const value of [null, "", "short", "x".repeat(513), " padded-session-identifier "]) {
    assert.throws(() => hashIdempotencyScope(value), TypeError);
  }
});


test("classifies new, replayed and conflicting idempotency records", () => {
  const original = "a".repeat(64);
  const changed = "b".repeat(64);
  assert.equal(classifyIdempotencyRecord(null, original), "new");
  assert.equal(classifyIdempotencyRecord(original, original), "replay");
  assert.equal(classifyIdempotencyRecord(original, changed), "conflict");
});

test("rejects malformed idempotency fingerprints", () => {
  assert.throws(() => classifyIdempotencyRecord(null, "bad"), TypeError);
  assert.throws(() => classifyIdempotencyRecord("bad", "a".repeat(64)), TypeError);
});

// ── Additional edge-case coverage ──

test("public references are exactly OC- followed by 16 uppercase hex chars", () => {
  for (let i = 0; i < 20; i++) {
    const ids = createOrderIdentifiers();
    assert.match(ids.publicReference, /^OC-[A-F0-9]{16}$/);
    assert.equal(ids.publicReference.length, 19);
  }
});

test("lookup tokens are exactly 43 base64url characters with no padding", () => {
  for (let i = 0; i < 20; i++) {
    const ids = createOrderIdentifiers();
    assert.match(ids.lookupToken, /^[A-Za-z0-9_-]{43}$/);
    assert.ok(!ids.lookupToken.includes("="), "token must not include padding");
    assert.ok(!ids.lookupToken.includes("+"), "token must not include + (base64 not base64url)");
    assert.ok(!ids.lookupToken.includes("/"), "token must not include / (base64 not base64url)");
  }
});

test("lookup token hash is irreversible and deterministic", () => {
  const ids = createOrderIdentifiers();
  const hash1 = hashLookupToken(ids.lookupToken);
  const hash2 = hashLookupToken(ids.lookupToken);
  assert.equal(hash1, hash2, "same token must produce the same hash");
  assert.notEqual(hash1, ids.lookupToken, "hash must differ from the token");
  assert.equal(hash1.length, 64, "SHA-256 hex digest is 64 chars");
});

test("hashLookupToken rejects tokens with base64 standard alphabet characters", () => {
  // 43 chars but using + and / which are base64, not base64url
  assert.throws(() => hashLookupToken("AAAAAAAAAAAAAAAAAAA+AAAAAAAAAAAAAAAAAAA/AAAA"), TypeError);
});

test("idempotency key validation boundary values", () => {
  assert.equal(isValidIdempotencyKey("x".repeat(15)), false, "15 chars is too short");
  assert.equal(isValidIdempotencyKey("x".repeat(16)), true, "16 chars is the minimum");
  assert.equal(isValidIdempotencyKey("x".repeat(200)), true, "200 chars is the maximum");
  assert.equal(isValidIdempotencyKey("x".repeat(201)), false, "201 chars is too long");
});

test("idempotency key rejects control characters, whitespace and special chars", () => {
  assert.equal(isValidIdempotencyKey("valid-key_with.dots:colons"), true);
  assert.equal(isValidIdempotencyKey("key\twith\ttabs1234"), false);
  assert.equal(isValidIdempotencyKey("key\nwith\nnewlines1"), false);
  assert.equal(isValidIdempotencyKey("key with spaces 123"), false);
  assert.equal(isValidIdempotencyKey("key/with/slashes123"), false);
  assert.equal(isValidIdempotencyKey("key@with@at@signs1"), false);
  assert.equal(isValidIdempotencyKey("key=with=equals123"), false);
});

test("readIdempotencyKey rejects non-object header inputs", () => {
  assert.equal(readIdempotencyKey(undefined), null);
  assert.equal(readIdempotencyKey(42), null);
  assert.equal(readIdempotencyKey("string"), null);
  assert.equal(readIdempotencyKey(true), null);
  assert.equal(readIdempotencyKey([{ "idempotency-key": "valid-key-1234567890" }]), null);
});

test("hashOrderRequest rejects BigInt values", () => {
  assert.throws(() => hashOrderRequest({ value: BigInt(42) }), TypeError);
});

test("hashOrderRequest rejects Symbol values", () => {
  assert.throws(() => hashOrderRequest({ value: Symbol("test") }), TypeError);
});

test("hashOrderRequest rejects function values", () => {
  assert.throws(() => hashOrderRequest({ callback: () => {} }), TypeError);
});

test("hashOrderRequest handles deeply nested objects consistently", () => {
  const deep = { a: { b: { c: { d: { e: "value" } } } } };
  const hash1 = hashOrderRequest(deep);
  const hash2 = hashOrderRequest(deep);
  assert.equal(hash1, hash2);
  assert.match(hash1, /^[0-9a-f]{64}$/);
});

test("hashOrderRequest handles empty objects and arrays", () => {
  const emptyObj = hashOrderRequest({});
  const emptyArr = hashOrderRequest([]);
  assert.match(emptyObj, /^[0-9a-f]{64}$/);
  assert.match(emptyArr, /^[0-9a-f]{64}$/);
  assert.notEqual(emptyObj, emptyArr, "empty object and array must produce different hashes");
});

test("hashOrderRequest rejects objects with non-plain prototypes", () => {
  class Custom { constructor() { this.x = 1; } }
  assert.throws(() => hashOrderRequest(new Custom()), TypeError);
});

test("hashIdempotencyScope rejects leading and trailing whitespace", () => {
  assert.throws(() => hashIdempotencyScope("  valid-scope-id-12345  "), TypeError);
  assert.throws(() => hashIdempotencyScope("\tvalid-scope-id-12345\t"), TypeError);
  assert.throws(() => hashIdempotencyScope("\nvalid-scope-id-12345\n"), TypeError);
});

test("hashIdempotencyScope produces different hashes for different scopes", () => {
  const scope1 = hashIdempotencyScope("customer-session-aaa");
  const scope2 = hashIdempotencyScope("customer-session-bbb");
  assert.notEqual(scope1, scope2);
});

test("classifyIdempotencyRecord treats undefined existing as new", () => {
  assert.equal(classifyIdempotencyRecord(undefined, "a".repeat(64)), "new");
});

test("classifyIdempotencyRecord rejects empty string as existing fingerprint", () => {
  assert.throws(() => classifyIdempotencyRecord("", "a".repeat(64)), TypeError);
});

test("classifyIdempotencyRecord rejects uppercase hex as fingerprint", () => {
  assert.throws(() => classifyIdempotencyRecord(null, "A".repeat(64)), TypeError);
  assert.throws(() => classifyIdempotencyRecord("A".repeat(64), "a".repeat(64)), TypeError);
});
