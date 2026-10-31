// POST /api/orders — validate and persist a COD order.
//
// Validates the order against the live product catalogue, resolves trusted
// prices, then persists the order and its line items to Supabase.
// Idempotency is enforced: replaying the same Idempotency-Key within the
// same scope returns the original order without creating a duplicate.
//
// This file runs as a Vercel serverless function.

import { productsResponse } from "./_lib/products-core.js";
import { validateOrderPayload, priceValidatedOrder } from "./_lib/order-validation.js";
import {
  createOrderIdentifiers,
  readIdempotencyKey,
  isValidIdempotencyKey,
  hashOrderRequest,
  hashIdempotencyScope,
  classifyIdempotencyRecord,
} from "./_lib/order-security.js";
import { supabasePost, supabaseGet } from "./_lib/supabase.js";

export const config = { maxDuration: 30 };

const json = (res, status, body) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(status).end(JSON.stringify(body));
};

const error = (res, status, message) => json(res, status, { error: message });

/**
 * Build a trusted product Map from the live approved catalogue.
 * Includes product titles for order-item snapshots.
 * Returns { ok, value?, reason? }.
 */
async function loadTrustedCatalogue(env) {
  const feed = await productsResponse({ method: "GET", url: "https://localhost/api/products", env });
  if (feed.status !== 200 || !feed.body?.products) {
    return { ok: false, reason: "Product catalogue is temporarily unavailable" };
  }

  const catalogue = new Map();
  for (const product of feed.body.products) {
    const colors = Array.isArray(product.colors) ? product.colors : [];
    const sizes = Array.isArray(product.sizes) ? product.sizes : [];
    const variants = [];
    if (colors.length > 0 || sizes.length > 0) {
      if (colors.length > 0 && sizes.length > 0) {
        for (const color of colors) {
          for (const size of sizes) {
            variants.push({ id: `${size}-${color}`.toLowerCase(), available: true, size, colour: color });
          }
        }
      } else if (colors.length > 0) {
        for (const color of colors) {
          variants.push({ id: String(color).toLowerCase(), available: true, size: null, colour: color });
        }
      } else {
        for (const size of sizes) {
          variants.push({ id: String(size).toLowerCase(), available: true, size, colour: null });
        }
      }
    }
    catalogue.set(product.id, {
      approved: true,
      active: true,
      priceBdt: product.price,
      title: product.name || product.title || "Product",
      variants,
    });
  }
  return { ok: true, value: catalogue };
}

/**
 * Look up the database UUID for a variant identified by product_id + size/colour.
 * Returns the UUID or null if not found.
 */
async function resolveVariantUuid(env, productId, variantId, catalogue) {
  if (!variantId) return null;
  // Find the variant metadata from catalogue to get size/colour
  const product = catalogue.get(productId);
  if (!product) return null;
  const variant = product.variants.find(v => v.id === variantId);
  if (!variant) return null;

  // Query the database for the real UUID
  const sizeFilter = variant.size ? `size=eq.${encodeURIComponent(variant.size)}` : "size=is.null";
  const colourFilter = variant.colour ? `colour=eq.${encodeURIComponent(variant.colour)}` : "colour=is.null";
  const query = `product_id=eq.${encodeURIComponent(productId)}&${sizeFilter}&${colourFilter}&select=id&limit=1`;

  try {
    const rows = await supabaseGet(env, "oc_product_variants", query);
    return rows?.[0]?.id || null;
  } catch {
    return null;
  }
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

  // ── Idempotency key ──
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
  const env = process.env;
  const catalogueResult = await loadTrustedCatalogue(env);
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

  // ── Generate identifiers and fingerprint ──
  const ids = createOrderIdentifiers();
  const requestFingerprint = hashOrderRequest(validated.value);
  // Use customer phone as idempotency scope (anonymous COD checkout)
  const scopeHash = hashIdempotencyScope(validated.value.customer.phone.padEnd(16, "0"));

  // ── Check if database is configured ──
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    // Fallback: validation-only mode (no database)
    return json(res, 200, {
      status: "accepted_for_review",
      publicReference: ids.publicReference,
      subtotalBdt: priced.value.subtotalBdt,
      deliveryBdt: priced.value.deliveryBdt,
      totalBdt: priced.value.totalBdt,
      itemCount: priced.value.lines.length,
      paymentMethod: priced.value.paymentMethod,
      notice: "Order validation succeeded. Database is not configured — this order has not been saved.",
    });
  }

  // ── Idempotency check ──
  try {
    const existing = await supabaseGet(env, "oc_orders",
      `idempotency_scope_hash=eq.${encodeURIComponent(scopeHash)}&idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&select=id,public_reference,request_fingerprint,subtotal_bdt,delivery_bdt,total_bdt,status&limit=1`
    );
    if (existing?.length > 0) {
      const classification = classifyIdempotencyRecord(existing[0].request_fingerprint, requestFingerprint);
      if (classification === "replay") {
        return json(res, 200, {
          status: existing[0].status,
          publicReference: existing[0].public_reference,
          subtotalBdt: existing[0].subtotal_bdt,
          deliveryBdt: existing[0].delivery_bdt,
          totalBdt: existing[0].total_bdt,
          replay: true,
        });
      }
      if (classification === "conflict") {
        return error(res, 409, "This Idempotency-Key has already been used with a different order.");
      }
    }
  } catch {
    // If the idempotency check fails, proceed with insertion —
    // the unique constraint will catch true duplicates.
  }

  // ── Persist order ──
  try {
    const orderRow = {
      public_reference: ids.publicReference,
      idempotency_scope_hash: scopeHash,
      idempotency_key: idempotencyKey,
      request_fingerprint: requestFingerprint,
      lookup_token_hash: ids.lookupTokenHash,
      customer_name: priced.value.customer.name,
      phone: priced.value.customer.phone,
      district: priced.value.customer.district,
      area: priced.value.customer.area || null,
      address: priced.value.customer.address,
      delivery_zone: priced.value.deliveryZone,
      subtotal_bdt: priced.value.subtotalBdt,
      delivery_bdt: priced.value.deliveryBdt,
      total_bdt: priced.value.totalBdt,
      payment_method: priced.value.paymentMethod,
    };

    const [orderResult] = await supabasePost(env, "oc_orders", orderRow);
    const orderId = orderResult.id;

    // ── Persist line items ──
    const itemRows = [];
    for (const line of priced.value.lines) {
      const product = catalogueResult.value.get(line.productId);
      const variantUuid = await resolveVariantUuid(env, line.productId, line.variantId, catalogueResult.value);
      const variant = line.variantId ? product?.variants?.find(v => v.id === line.variantId) : null;
      itemRows.push({
        order_id: orderId,
        product_id: line.productId,
        variant_id: variantUuid,
        product_title_snapshot: product?.title || "Product",
        variant_snapshot: variant ? { size: variant.size, colour: variant.colour } : {},
        unit_price_bdt: line.unitPriceBdt,
        quantity: line.quantity,
        line_total_bdt: line.lineTotalBdt,
      });
    }

    if (itemRows.length > 0) {
      await supabasePost(env, "oc_order_items", itemRows);
    }

    return json(res, 201, {
      status: "accepted_for_review",
      publicReference: ids.publicReference,
      lookupToken: ids.lookupToken,
      subtotalBdt: priced.value.subtotalBdt,
      deliveryBdt: priced.value.deliveryBdt,
      totalBdt: priced.value.totalBdt,
      itemCount: priced.value.lines.length,
      paymentMethod: priced.value.paymentMethod,
    });
  } catch (err) {
    // Handle unique constraint violation (idempotency race)
    if (err.code === "23505") {
      return error(res, 409, "Duplicate order detected. Please retry with a new Idempotency-Key.");
    }
    console.error("Order persistence error:", err.message);
    return error(res, 500, "Order could not be saved. Please try again.");
  }
}
