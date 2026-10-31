// POST /api/orders — validate a COD order against the trusted product catalogue.
//
// Phase 1 (current): validation only. No database is configured, so this endpoint
// proves the full validation pipeline works end-to-end but does not persist orders.
// The response clearly states this. Phase 2 adds persistence once a database is
// connected by the owner.
//
// This file runs as a Vercel serverless function.

import { productsResponse } from "./_lib/products-core.js";
import { validateOrderPayload, priceValidatedOrder } from "./_lib/order-validation.js";
import { createOrderIdentifiers, readIdempotencyKey, isValidIdempotencyKey, hashOrderRequest } from "./_lib/order-security.js";

export const config = { maxDuration: 30 };

const json = (res, status, body) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(status).end(JSON.stringify(body));
};

const error = (res, status, message) => json(res, status, { error: message });

/**
 * Build a trusted product Map from the live approved catalogue.
 * Returns { ok, value?, reason? }.
 */
async function loadTrustedCatalogue(env) {
  const feed = await productsResponse({ method: "GET", url: "https://localhost/api/products", env });
  if (feed.status !== 200 || !feed.body?.products) {
    return { ok: false, reason: "Product catalogue is temporarily unavailable" };
  }

  const catalogue = new Map();
  for (const product of feed.body.products) {
    if (!product.approved || !product.active) continue;
    catalogue.set(product.id, {
      approved: true,
      active: true,
      priceBdt: product.priceBdt,
      variants: product.variants || [],
    });
  }
  return { ok: true, value: catalogue };
}

export default async function handler(req, res) {
  // ── Method gate ──
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return error(res, 405, "Only POST is accepted");
  }

  // ── Idempotency key (required by contract, validated even without persistence) ──
  const idempotencyKey = readIdempotencyKey(req.headers);
  if (idempotencyKey === null) {
    return error(res, 400, "A valid Idempotency-Key header is required (16-200 alphanumeric characters, dots, hyphens, underscores or colons)");
  }
  if (!isValidIdempotencyKey(idempotencyKey)) {
    return error(res, 400, "Idempotency-Key is invalid: must be 16-200 characters matching [A-Za-z0-9._:-]");
  }

  // ── Parse body ──
  const body = req.body;
  if (!body || typeof body !== "object") {
    return error(res, 400, "Request body must be a JSON object");
  }

  // ── Validate order structure ──
  const validated = validateOrderPayload(body);
  if (!validated.ok) {
    return error(res, 400, validated.reason);
  }

  // ── Load trusted catalogue ──
  // eslint-disable-next-line no-undef -- process.env is provided by Vercel's Node runtime
  const catalogueResult = await loadTrustedCatalogue(process.env);
  if (!catalogueResult.ok) {
    return error(res, 503, catalogueResult.reason);
  }

  // ── Resolve trusted prices ──
  const priced = priceValidatedOrder(validated, catalogueResult.value);
  if (!priced.ok) {
    const status = priced.reason?.includes("not found") || priced.reason?.includes("not approved")
      ? 404
      : 422;
    return error(res, status, priced.reason);
  }

  // ── Generate identifiers ──
  const ids = createOrderIdentifiers();
  // Fingerprint is computed now for contract completeness; Phase 2 stores it
  // alongside the idempotency key for replay/conflict detection.
  void hashOrderRequest(validated.value);

  // ── Phase 1 response: validation succeeded, but no persistence ──
  // In Phase 2 this becomes a 201 with database insertion, lookup token,
  // and idempotency replay/conflict detection.
  return json(res, 200, {
    status: "accepted_for_review",
    publicReference: ids.publicReference,
    subtotalBdt: priced.value.subtotalBdt,
    deliveryBdt: priced.value.deliveryBdt,
    totalBdt: priced.value.totalBdt,
    itemCount: priced.value.items.length,
    paymentMethod: priced.value.paymentMethod,
    notice: "Order validation succeeded. Persistence is not yet configured — this order has not been saved.",
  });
}
