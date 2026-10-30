// Server-side order validation helpers. These functions do not persist orders.
// Call only after loading the approved product/variant catalogue from a trusted server source.
export const DELIVERY_FEES_BDT = Object.freeze({ inside: 60, sub: 100, outside: 120 });
export const FREE_DELIVERY_FROM_BDT = 999;
const MAX_LINES = 30;
const MAX_QUANTITY = 99;
const MAX_TEXT = 500;

const cleanText = (value, max = MAX_TEXT) =>
  typeof value === "string" ? value.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, max) : ""; // eslint-disable-line no-control-regex -- strip control characters from untrusted customer input

export function validateOrderPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "Invalid order payload." };
  }
  if (!Array.isArray(payload.items) || payload.items.length < 1 || payload.items.length > MAX_LINES) {
    return { ok: false, error: "Your cart must contain between 1 and 30 different lines." };
  }
  const customer = payload.customer;
  if (!customer || typeof customer !== "object" || Array.isArray(customer)) {
    return { ok: false, error: "Customer details are required." };
  }
  const zone = cleanText(payload.deliveryZone, 20);
  if (!Object.hasOwn(DELIVERY_FEES_BDT, zone)) {
    return { ok: false, error: "Choose a valid delivery area." };
  }
  const name = cleanText(customer.name, 100);
  const phone = cleanText(customer.phone, 32);
  const district = cleanText(customer.district, 80);
  const area = cleanText(customer.area, 100);
  const address = cleanText(customer.address, 300);
  if (name.length < 2 || !/^[+\d][\d\s()+-]{7,30}$/.test(phone) || !district || address.length < 5) {
    return { ok: false, error: "Enter a valid name, phone, district and delivery address." };
  }
  const items = [];
  for (const line of payload.items) {
    if (!line || typeof line !== "object" || Array.isArray(line)) {
      return { ok: false, error: "An item in your cart is invalid." };
    }
    const productId = cleanText(line.productId, 120);
    const variantId = line.variantId == null ? null : (cleanText(line.variantId, 120) || null);
    const quantity = Number(line.quantity);
    if (!productId || !Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      return { ok: false, error: "A product, variant or quantity is invalid." };
    }
    const existing = items.find(entry => entry.productId === productId && entry.variantId === variantId);
    if (existing) {
      if (existing.quantity + quantity > MAX_QUANTITY) {
        return { ok: false, error: "The combined quantity for a product variant cannot exceed 99." };
      }
      existing.quantity += quantity;
    } else {
      items.push({ productId, variantId, quantity });
    }
  }
  return {
    ok: true,
    value: { customer: { name, phone, district, area, address }, deliveryZone: zone, items },
  };
}

// trustedProducts is a Map keyed by product id. Each entry:
// { approved: true, active: true, priceBdt: integer, variants: [{ id, available: true }] }
export function priceValidatedOrder(validated, trustedProducts) {
  if (!validated?.ok || !(trustedProducts instanceof Map)) {
    return { ok: false, error: "Order could not be validated." };
  }
  const lines = [];
  let subtotalBdt = 0;
  for (const item of validated.value.items) {
    const product = trustedProducts.get(item.productId);
    if (!product || product.approved !== true || product.active !== true ||
        !Number.isSafeInteger(product.priceBdt) || product.priceBdt < 1) {
      return { ok: false, error: "A product is unavailable. Please refresh your cart." };
    }
    const variants = Array.isArray(product.variants) ? product.variants : [];
    if (variants.length > 0 && !item.variantId) {
      return { ok: false, error: "Choose a size or colour for this product." };
    }
    if (item.variantId) {
      const variant = variants.find(v => v.id === item.variantId);
      if (!variant || variant.available !== true) {
        return { ok: false, error: "A selected size or colour is unavailable." };
      }
    }
    const lineTotalBdt = product.priceBdt * item.quantity;
    if (!Number.isSafeInteger(lineTotalBdt)) return { ok: false, error: "Order total is invalid." };
    subtotalBdt += lineTotalBdt;
    if (!Number.isSafeInteger(subtotalBdt)) return { ok: false, error: "Order total is invalid." };
    lines.push({ ...item, unitPriceBdt: product.priceBdt, lineTotalBdt });
  }
  const deliveryBdt = subtotalBdt >= FREE_DELIVERY_FROM_BDT ? 0 : DELIVERY_FEES_BDT[validated.value.deliveryZone];
  const totalBdt = subtotalBdt + deliveryBdt;
  if (!Number.isSafeInteger(totalBdt)) return { ok: false, error: "Order total is invalid." };
  return {
    ok: true,
    value: {
      customer: validated.value.customer,
      deliveryZone: validated.value.deliveryZone,
      lines,
      subtotalBdt,
      deliveryBdt,
      totalBdt,
      paymentMethod: "cod",
    },
  };
}
