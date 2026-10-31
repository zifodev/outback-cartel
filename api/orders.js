// POST /api/orders — validate and persist a COD order.
//
// Validates the order against the live product catalogue, resolves trusted
// prices, then persists the order and its line items to Supabase.
// Idempotency is enforced: replaying the same Idempotency-Key within the
// same scope returns the original order without creating a duplicate.
//
// This file runs as a Vercel serverless function.

import { productsResponse } from "./_lib/products-core.js";
import { HOUSE_PRODUCTS } from "./_lib/house-products.js";
import { validateOrderPayload, priceValidatedOrder } from "./_lib/order-validation.js";
import {
  createOrderIdentifiers,
  readIdempotencyKey,
  isValidIdempotencyKey,
  hashOrderRequest,
  hashIdempotencyScope,
} from "./_lib/order-security.js";
import { supabaseRpc, supabaseGet } from "./_lib/supabase.js";

export const config = { maxDuration: 30 };

const json = (res, status, body) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(status).end(JSON.stringify(body));
};

const error = (res, status, message) => json(res, status, { error: message });

/** Build the { id, available, size, colour } variant list for a product's colors × sizes. */
function buildVariants(colors, sizes) {
  const variants = [];
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
  } else if (sizes.length > 0) {
    for (const size of sizes) {
      variants.push({ id: String(size).toLowerCase(), available: true, size, colour: null });
    }
  }
  return variants;
}

/**
 * Build a trusted product Map from the live approved supplier catalogue plus our own
 * house-brand products (HOUSE_PRODUCTS — not part of the supplier feed; see house-products.js).
 * Includes product titles for order-item snapshots.
 * Returns { ok, value?, reason? }.
 */
async function loadTrustedCatalogue(env) {
  const feed = await productsResponse({ method: "GET", url: "https://localhost/api/products", env });
  if (feed.status !== 200 || !feed.body?.products) {
    return { ok: false, reason: "Product catalogue is temporarily unavailable" };
  }

  const catalogue = new Map();

  for (const product of HOUSE_PRODUCTS) {
    catalogue.set(product.id, {
      approved: true,
      active: true,
      priceBdt: product.price,
      title: product.name,
      variants: buildVariants(product.colors || [], product.sizes || []),
    });
  }

  for (const product of feed.body.products) {
    const colors = Array.isArray(product.colors) ? product.colors : [];
    const sizes = Array.isArray(product.sizes) ? product.sizes : [];
    catalogue.set(product.id, {
      approved: true,
      active: true,
      priceBdt: product.price,
      title: product.name || product.title || "Product",
      variants: buildVariants(colors, sizes),
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
    return error(res, 400, validated.error);
  }

  // ── Load trusted catalogue ──
  const env = process.env;
  const catalogueResult = await loadTrustedCatalogue(env);
  if (!catalogueResult.ok) {
    return error(res, 503, catalogueResult.reason);
  }

  // ── Resolve trusted prices ──
  const priced = priceValidatedOrder(validated, catalogueResult.value);
  if (!priced.ok) {
    const status = priced.error?.includes("not found") || priced.error?.includes("not approved")
      ? 404
      : 422;
    return error(res, status, priced.error);
  }

  // ── Generate identifiers and fingerprint ──
  const ids = createOrderIdentifiers();
  const requestFingerprint = hashOrderRequest(validated.value);
  // Use customer phone as idempotency scope (anonymous COD checkout)
  const scopeHash = hashIdempotencyScope(validated.value.customer.phone.padEnd(16, "0"));

  // ── Check if database is configured ──
  // This must be a hard failure, never a 200. The checkout UI treats any
  // res.ok response as "order placed" and shows the customer a reference
  // number and a WhatsApp-advance prompt — so a 200 here with no row ever
  // written would be a false order confirmation. Fail the same way the
  // admin endpoints already do when the database isn't configured.
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Order rejected: SUPABASE_SERVICE_ROLE_KEY is not configured — orders cannot be persisted.");
    return error(res, 503, "Orders cannot be placed right now. Please try again shortly or message us on WhatsApp.");
  }

  // ── Build line-item rows (variant UUID lookups) ──
  const itemRows = [];
  for (const line of priced.value.lines) {
    const product = catalogueResult.value.get(line.productId);
    const variantUuid = await resolveVariantUuid(env, line.productId, line.variantId, catalogueResult.value);
    const variant = line.variantId ? product?.variants?.find(v => v.id === line.variantId) : null;
    itemRows.push({
      product_id: line.productId,
      variant_id: variantUuid || "",
      product_title_snapshot: product?.title || "Product",
      variant_snapshot: variant ? { size: variant.size, colour: variant.colour } : {},
      unit_price_bdt: line.unitPriceBdt,
      quantity: line.quantity,
      line_total_bdt: line.lineTotalBdt,
    });
  }

  // ── Persist order + items atomically ──
  // oc_create_order_with_items does the idempotency lookup and both inserts
  // inside a single database transaction (see its migration for why): either
  // the whole order is saved with every line item, or nothing is, and a
  // replay of the same Idempotency-Key is detected without a separate lookup
  // step that could fail open.
  try {
    const result = await supabaseRpc(env, "oc_create_order_with_items", {
      p_order: {
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
      },
      p_items: itemRows,
    });

    if (result.replay) {
      return json(res, 200, {
        status: result.status,
        publicReference: result.public_reference,
        subtotalBdt: result.subtotal_bdt,
        deliveryBdt: result.delivery_bdt,
        totalBdt: result.total_bdt,
        replay: true,
      });
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
    if (err.code === "23505" || /IDEMPOTENCY_CONFLICT/.test(err.message || "")) {
      return error(res, 409, "This Idempotency-Key has already been used with a different order.");
    }
    console.error("Order persistence error:", err.message);
    return error(res, 500, "Order could not be saved. Please try again.");
  }
}
