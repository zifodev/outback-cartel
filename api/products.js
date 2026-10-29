/* global process */
// ─────────────────────────────────────────────────────────────
//  /api/products — Vercel serverless function (runs on the server)
//
//  Merges products from TWO suppliers into one feed for the site:
//
//   1) Mohasagor / dropshipping.com.bd reseller API
//   2) Business Koro storefront API
//
//  Both suppliers' keys NEVER reach the browser: they are read from
//  Vercel → Project → Settings → Environment Variables. Each supplier
//  is fetched independently — if one is down or misconfigured, the
//  other's products still show, instead of the whole feed failing.
//
//  ── Mohasagor ──
//    DROPSHIP_API_KEY        (required to enable) your API key
//    DROPSHIP_SECRET_KEY     (required to enable) your secret key
//    DROPSHIP_MARKUP_PERCENT (optional)  e.g. 20 → add 20% to every price
//    DROPSHIP_MARKUP_FLAT    (optional)  e.g. 100 → add ৳100 to every price
//    DROPSHIP_IMAGE_BASE     (optional)  where product images live,
//                                        default https://mohasagor.com.bd/
//    DROPSHIP_CATEGORY_MAP   (optional)  JSON mapping supplier category_id
//                                        to your site's category keys,
//                                        e.g. {"1":"clothing","5":"home"}
//    DROPSHIP_MAX_PAGES      (optional)  page safety limit, default 100 (all)
//    DROPSHIP_PRICE_FIELD    (optional)  "price" (default) or "sale_price"
//    DROPSHIP_IN_STOCK_ONLY  (optional)  1 = only items marked "available"
//
//  ── Business Koro ──
//    BUSINESSKORO_API_KEY       (required to enable) your x-api-key
//    BUSINESSKORO_DOMAIN        (optional) only needed if you have NOT set
//                                a domain restriction in their dashboard;
//                                sends it as the x-domain header
//    BUSINESSKORO_MARKUP_PERCENT(optional) added on top of their suggestedPrice
//    BUSINESSKORO_MARKUP_FLAT   (optional) added on top of their suggestedPrice
//
//  ── Combined ──
//    DROPSHIP_MAX_PRODUCTS   (optional)  total products shown across BOTH
//                                        suppliers, default = all
//                                        (clothing/winter listed first)
//
//  Visit /api/products?debug=1 on your site to check both connections.
// ─────────────────────────────────────────────────────────────
import { createHash } from "node:crypto";

const MOHASAGOR_URL = "https://mohasagor.com.bd/api/reseller/product";
const BUSINESSKORO_URL = "https://api.businesskoro.com/api/v1/storefront/products";

// allow up to 60s on the server to gather every page (Vercel function limit)
export const config = { maxDuration: 60 };
const BATCH = 3; // pages fetched in parallel per batch (the supplier limits how fast we can ask)

const num = v => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// the API returns { status, products: [...] } — also accept a paginated { products: { data: [...] } } shape
const pickList = data => {
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.products?.data)) return data.products.data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};
const pickLastPage = data =>
  num(data?.last_page ?? data?.products?.last_page ?? data?.meta?.last_page ?? data?.pagination?.last_page) || 1;

// supplier category name → this site's category key. The supplier uses a small
// fixed set of categories, so map them exactly; the regex rules are a fallback
// for any new/unexpected supplier category, or for suppliers (like Business Koro)
// that don't send a category at all — we guess from the product name instead.
// These keys must match CATS in App.jsx.
const EXACT_CATEGORY = {
  "men's fashion": "mens",
  "mens fashion": "mens",
  "women's fashion": "womens",
  "womens fashion": "womens",
  "winter": "winter",
  "kids zone": "kids",
  "gadgets & electronics": "electronics",
  "home & lifestyle": "home",
  "watch": "watches",
  "other's": "giftsfood",
  "others": "giftsfood",
  "customize & gift": "giftsfood",
  "foods": "giftsfood",
  "food": "giftsfood",
};
const CATEGORY_RULES = [
  [/winter|jacket|sweater|hoodie|woolen|warm/i, "winter"],
  [/kid|baby|child|toy/i, "kids"],
  [/\bmen|gents|panjabi|boys/i, "mens"],
  [/\bwomen|ladies|saree|girls|kurti/i, "womens"],
  [/fashion|cloth|shirt|dress|shoe|jewel|t-?shirt|pant|trouser/i, "mens"],
  [/watch/i, "watches"],
  [/gadget|electronic|computer|laptop|audio|headphone|earphone|speaker|phone|mobile|charger|gaming/i, "electronics"],
  [/home|kitchen|lifestyle|decor|furniture|household|living/i, "home"],
  [/gift|food|snack/i, "giftsfood"],
];
const guessCategory = name => {
  const n = String(name || "").trim();
  if (EXACT_CATEGORY[n.toLowerCase()]) return EXACT_CATEGORY[n.toLowerCase()];
  for (const [re, key] of CATEGORY_RULES) if (re.test(n)) return key;
  return "giftsfood";
};

// supplier description (HTML or plain text) → a few short plain-text lines for the Description tab
const detailLines = html => String(html || "")
  .replace(/<\s*(br|\/li|\/p|\/div|\/h\d)\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
  .split("\n").map(t => t.replace(/\s+/g, " ").trim()).filter(t => t.length > 1).slice(0, 8).map(t => t.slice(0, 140));

// tolerate stray spaces, line breaks or quotes picked up when pasting keys into Vercel
const clean = v => String(v || "").trim().replace(/^["']+|["']+$/g, "").trim();

// ─────────────────────────────────────────────────────────────
//  Mohasagor
// ─────────────────────────────────────────────────────────────
async function fetchMohasagor(debug) {
  const key = clean(process.env.DROPSHIP_API_KEY);
  const secret = clean(process.env.DROPSHIP_SECRET_KEY);
  if (!key || !secret) return { configured: false, products: [], raw: [], error: null };

  const imageBase = (process.env.DROPSHIP_IMAGE_BASE || "https://mohasagor.com.bd/").replace(/\/*$/, "/");
  const markupPct = num(process.env.DROPSHIP_MARKUP_PERCENT);
  const markupFlat = num(process.env.DROPSHIP_MARKUP_FLAT);
  const maxPages = Math.max(1, num(process.env.DROPSHIP_MAX_PAGES) || 100);
  let catMap = {};
  try { catMap = JSON.parse(process.env.DROPSHIP_CATEGORY_MAP || "{}"); } catch { catMap = {}; }

  const url = path => {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    return imageBase + String(path).replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/");
  };

  const fetchPage = async pg => {
    const r = await fetch(`${MOHASAGOR_URL}?page=${pg}`, {
      headers: { "api-key": key, "secret-key": secret, Accept: "application/json" },
    });
    if (!r.ok) {
      // keep the supplier's own message (shown only with ?debug=1) so a rejected key is easy to diagnose
      const e = new Error(`Mohasagor API answered ${r.status}`);
      try { e.body = (await r.text()).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400); } catch { /* ignore */ }
      throw e;
    }
    return r.json();
  };

  try {
    // page 1 tells us how many pages there are; fetch the rest in parallel batches
    const first = await fetchPage(1);
    const raw = pickList(first);
    const trueLastPage = pickLastPage(first);
    const lastPage = Math.min(trueLastPage, maxPages);
    for (let start = 2; start <= lastPage; start += BATCH) {
      const pages = [];
      for (let pg = start; pg < start + BATCH && pg <= lastPage; pg++) pages.push(pg);
      const batch = await Promise.all(pages.map(pg => fetchPage(pg).catch(() => null)));
      batch.forEach(d => { if (d) raw.push(...pickList(d)); });
    }

    // Show everything except products explicitly marked inactive or out of stock.
    // Most of this supplier's catalog has a blank stock_status, which we treat as sellable.
    // Set DROPSHIP_IN_STOCK_ONLY=1 to list ONLY items explicitly marked "available".
    const inStockOnly = /^(1|true|yes)$/i.test(String(process.env.DROPSHIP_IN_STOCK_ONLY || ""));
    const INACTIVE = new Set(["0", "inactive", "draft", "disabled", "unpublished", "pending", "false"]);
    const OUT = new Set(["stock_out", "out_of_stock", "out of stock", "unavailable", "sold_out", "sold out", "0", "no"]);
    const products = raw
      .filter(p => !INACTIVE.has(String(p.status).toLowerCase()) &&
                   (inStockOnly
                     ? p.stock_status === "available"
                     : !OUT.has(String(p.stock_status || "").toLowerCase())))
      .map(p => {
        // Which supplier number to sell at. DROPSHIP_PRICE_FIELD can be "price" (default: the
        // supplier's regular price, the higher number) or "sale_price" (their discounted price).
        // reselling_price, when the API sends it, is always preferred.
        const field = (process.env.DROPSHIP_PRICE_FIELD || "price").trim();
        const base = num(p.reselling_price) || num(p[field]) || num(p.price) || num(p.sale_price);
        const price = Math.round(base * (1 + markupPct / 100) + markupFlat);
        const regular = field === "sale_price" && num(p.price) > price ? num(p.price) : null;
        const imgList = Array.isArray(p.product_images) ? p.product_images : Array.isArray(p.product_image) ? p.product_image : [];
        const images = imgList
          .map(im => url(im && im.product_image))
          .filter(Boolean)
          .slice(0, 4); // keep the payload small across thousands of products
        return {
          id: `ds-${p.id}`,
          remote: true,
          supplier: "mohasagor",
          supplierId: p.id,
          code: p.product_code ?? null,
          slug: p.slug || "",
          name: String(p.name || "Product").trim(),
          cat: catMap[String(p.category_id)] || catMap[String(p.category)] || (/hoodie|hoody/i.test(p.name || "") ? "hoodies" : guessCategory(p.category || p.category_name)),
          supplierCategory: p.category || null,
          colors: (Array.isArray(p.product_variants) ? p.product_variants : [])
            .filter(v => /colou?r/i.test(v.attribute || "")).map(v => v.variant).filter(Boolean),
          sizes: (Array.isArray(p.product_variants) ? p.product_variants : [])
            .filter(v => /size/i.test(v.attribute || "")).map(v => v.variant).filter(Boolean),
          price,
          old: regular,
          icon: "📦",
          badge: null,
          img: images[0] || url(p.thumbnail_img),
          images,
          details: detailLines(p.details),
        };
      }).filter(p => p.price > 0 && p.img);

    return { configured: true, products, raw, error: null, pagesFetched: lastPage, lastPage: trueLastPage };
  } catch (err) {
    const error = { message: String(err && err.message || err) };
    if (debug && err && err.body) error.supplierSays = err.body;
    if (debug) {
      const rawVals = { apiKey: String(process.env.DROPSHIP_API_KEY || ""), secretKey: String(process.env.DROPSHIP_SECRET_KEY || "") };
      error.keyCheck = { apiKeyLength: key.length, secretKeyLength: secret.length, hadExtraSpacesOrQuotes: rawVals.apiKey !== key || rawVals.secretKey !== secret };
      const fp = v => (v.length > 6 ? `${v.slice(0, 2)}…${v.slice(-2)} (${v.length})` : `(${v.length})`);
      const h = v => createHash("sha256").update(v).digest("hex").slice(0, 16);
      console.log(`[products] mohasagor key check api=${fp(key)} #${h(key)} secret=${fp(secret)} #${h(secret)}`);
    }
    return { configured: true, products: [], raw: [], error };
  }
}

// ─────────────────────────────────────────────────────────────
//  Business Koro
// ─────────────────────────────────────────────────────────────
async function fetchBusinessKoro(debug) {
  const apiKey = clean(process.env.BUSINESSKORO_API_KEY);
  if (!apiKey) return { configured: false, products: [], raw: [], error: null };

  const domain = clean(process.env.BUSINESSKORO_DOMAIN);
  const markupPct = num(process.env.BUSINESSKORO_MARKUP_PERCENT);
  const markupFlat = num(process.env.BUSINESSKORO_MARKUP_FLAT);

  const headers = { "x-api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" };
  if (domain) headers["x-domain"] = domain;

  // their /storefront/products endpoint is a flat { data: [...] } list (no pagination documented),
  // but we follow a Laravel-style meta.last_page / links.next if present, just in case, capped for safety
  const fetchPage = async pg => {
    const sep = BUSINESSKORO_URL.includes("?") ? "&" : "?";
    const r = await fetch(pg > 1 ? `${BUSINESSKORO_URL}${sep}page=${pg}` : BUSINESSKORO_URL, { headers });
    if (!r.ok) {
      const e = new Error(`Business Koro API answered ${r.status}`);
      try { e.body = (await r.text()).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400); } catch { /* ignore */ }
      throw e;
    }
    return r.json();
  };

  try {
    const first = await fetchPage(1);
    const raw = pickList(first);
    const trueLastPage = pickLastPage(first);
    const lastPage = Math.min(trueLastPage, 50); // safety cap
    for (let pg = 2; pg <= lastPage; pg++) {
      const d = await fetchPage(pg).catch(() => null);
      if (d) raw.push(...pickList(d));
    }

    const products = raw
      .filter(p => p.inStock !== false)
      .map(p => {
        const base = num(p.suggestedPrice) || num(p.costPrice);
        const floor = num(p.minimumSellingPrice?.customerPaysDelivery);
        let price = Math.round(base * (1 + markupPct / 100) + markupFlat);
        if (floor > 0 && price < floor) price = floor; // stay above the supplier's minimum or the order gets rejected
        const variants = Array.isArray(p.variants) ? p.variants : [];
        const images = (Array.isArray(p.images) ? p.images : []).filter(Boolean).slice(0, 4);
        return {
          id: `bk-${p.id}`,
          remote: true,
          supplier: "businesskoro",
          supplierId: p.id,
          code: null,
          slug: "",
          name: String(p.name || "Product").trim(),
          cat: /hoodie|hoody/i.test(p.name || "") ? "hoodies" : guessCategory(p.name),
          supplierCategory: null,
          colors: [...new Set(variants.map(v => v.color).filter(Boolean))],
          sizes: [...new Set(variants.map(v => v.size).filter(Boolean))],
          price,
          old: num(p.suggestedPrice) > price ? num(p.suggestedPrice) : null,
          icon: "📦",
          badge: null,
          img: images[0] || "",
          images,
          details: detailLines(p.description),
        };
      }).filter(p => p.price > 0 && p.img);

    return { configured: true, products, raw, error: null, pagesFetched: lastPage, lastPage: trueLastPage };
  } catch (err) {
    const error = { message: String(err && err.message || err) };
    if (debug && err && err.body) error.supplierSays = err.body;
    if (debug) {
      const fp = v => (v.length > 6 ? `${v.slice(0, 2)}…${v.slice(-2)} (${v.length})` : `(${v.length})`);
      const h = v => createHash("sha256").update(v).digest("hex").slice(0, 16);
      console.log(`[products] businesskoro key check api=${fp(apiKey)} #${h(apiKey)}`);
    }
    return { configured: true, products: [], raw: [], error };
  }
}

export default async function handler(req, res) {
  // Parse the request URL ourselves with the WHATWG URL API instead of touching req.query —
  // reading req.query triggers Vercel's Node runtime to fall back to the legacy, deprecated
  // url.parse() (Node's DEP0169 warning) the first time that getter is accessed.
  const requestUrl = new URL(req.url, "http://localhost");
  const debug = requestUrl.searchParams.has("debug");

  const [mohasagor, businessKoro] = await Promise.all([
    fetchMohasagor(debug),
    fetchBusinessKoro(debug),
  ]);

  if (!mohasagor.configured && !businessKoro.configured) {
    res.status(500).json({ error: "No supplier is configured. Set DROPSHIP_API_KEY/DROPSHIP_SECRET_KEY and/or BUSINESSKORO_API_KEY in Vercel Environment Variables." });
    return;
  }

  if (debug) {
    res.setHeader("Cache-Control", "no-store");
    const summarize = (label, result) => {
      if (!result.configured) return { configured: false };
      if (result.error) return { configured: true, error: result.error };
      const categories = {};
      result.raw.forEach(p => { const c = p.category || p.category_name || p.category_id || "?"; categories[c] = (categories[c] || 0) + 1; });
      return {
        configured: true,
        count: result.raw.length,
        usableCount: result.products.length,
        pagesFetched: result.pagesFetched,
        lastPage: result.lastPage,
        categories: label === "mohasagor" ? categories : undefined,
      };
    };
    res.status(200).json({
      ok: true,
      mohasagor: summarize("mohasagor", mohasagor),
      businessKoro: summarize("businesskoro", businessKoro),
      combinedUsableCount: mohasagor.products.length + businessKoro.products.length,
    });
    return;
  }

  if (mohasagor.error && businessKoro.error) {
    // both configured suppliers failed — surface it like before
    res.setHeader("Cache-Control", "s-maxage=60");
    res.status(502).json({
      error: "Could not load supplier products.",
      mohasagor: mohasagor.error,
      businessKoro: businessKoro.error,
    });
    return;
  }

  const all = [...mohasagor.products, ...businessKoro.products];

  // Show all products by default, fashion (men/women/winter/kids) listed first.
  // Set DROPSHIP_MAX_PRODUCTS to a number to cap the combined total (fashion is
  // always kept in full, then other categories fill the rest up to that number).
  const maxEnv = num(process.env.DROPSHIP_MAX_PRODUCTS);
  const maxProducts = maxEnv > 0 ? maxEnv : Infinity;
  const FASHION = new Set(["hoodies", "mens", "womens", "winter", "kids"]);
  const fashion = all.filter(p => FASHION.has(p.cat));
  const others = all.filter(p => !FASHION.has(p.cat));
  const products = fashion.concat(others).slice(0, Math.max(maxProducts, fashion.length));

  // cache on Vercel's edge for an hour and keep serving it for a day while it refreshes in the
  // background, so each supplier is asked rarely (they rate-limit / may block keys that call too often)
  res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
  res.status(200).json({
    products,
    count: products.length,
    fashionCount: fashion.length,
    updatedAt: new Date().toISOString(),
    suppliers: {
      mohasagor: mohasagor.error ? { ok: false, error: mohasagor.error.message } : { ok: mohasagor.configured, count: mohasagor.products.length },
      businessKoro: businessKoro.error ? { ok: false, error: businessKoro.error.message } : { ok: businessKoro.configured, count: businessKoro.products.length },
    },
  });
}
