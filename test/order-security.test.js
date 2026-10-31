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
