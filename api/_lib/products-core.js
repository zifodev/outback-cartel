// ─────────────────────────────────────────────────────────────
//  Product feed — the shared server code behind /api/products
//
//  The same code runs on two hosts:
//    - Vercel:      api/products.js passes in its environment variables
//    - Cloudflare:  worker/index.js passes in the Worker's env (secrets + settings)
//  Files in folders starting with "_" are not turned into Vercel functions.
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
//
//  ── Supplier call limit ──
//    SUPPLIER_CALL_LIMIT     (optional)  most supplier requests one feed request may make, shared
//                                        by the suppliers. Cloudflare's free plan allows 50
//                                        outgoing calls per request, so the Worker sets 40.
//                                        Not set (Vercel) = no extra limit, as before.
//                                        If a catalogue needs more pages than this, the feed shows
//                                        what it could fetch and the debug report says "truncated".
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
//  ── Protected debug report ──
//    PRODUCTS_DEBUG_TOKEN    (optional)  a long random value you choose (16+ characters).
//                                        Then /api/products?debug=<that value> shows each
//                                        supplier's status and the product review list.
//                                        Not set = the debug report is switched off.
//
//  Supplier products are published only after review: see APPROVED_SUPPLIER_PRODUCTS below.
// ─────────────────────────────────────────────────────────────
import { createHash, timingSafeEqual } from "node:crypto";

const MOHASAGOR_URL = "https://mohasagor.com.bd/api/reseller/product";
const BUSINESSKORO_URL = "https://api.businesskoro.com/api/v1/storefront/products";
// MOHASAGOR_API_URL / BUSINESSKORO_API_URL (optional settings) point the feed at a local stand-in
// supplier for automated tests. Leave them unset everywhere else.
const mohasagorUrl = env => clean(env.MOHASAGOR_API_URL) || MOHASAGOR_URL;
const businessKoroUrl = env => clean(env.BUSINESSKORO_API_URL) || BUSINESSKORO_URL;

const BATCH = 3; // pages fetched in parallel per batch (the supplier limits how fast we can ask)

// Request settings are passed explicitly; never store per-request secrets in module-global state.

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

// A shared allowance of supplier calls for one feed request. Each supplier takes calls from it and
// stops paging when its share runs out, so the total can never pass the host's limit.
const makeBudget = limit => ({ left: limit, used: 0, take() { if (this.left <= 0) return false; this.left--; this.used++; return true; } });
const outOfCalls = () => Object.assign(new Error("supplier call limit reached"), { outOfCalls: true });

// tolerate stray spaces, line breaks or quotes picked up when pasting keys into Vercel
const clean = v => String(v || "").trim().replace(/^["']+|["']+$/g, "").trim();

// ─────────────────────────────────────────────────────────────
//  Supplier product review
// ─────────────────────────────────────────────────────────────
// Supplier products are NOT published automatically. One appears in the shop only when
//   1. its id is in APPROVED_SUPPLIER_PRODUCTS below, and
//   2. its name matches none of the HOLD_RULES. These always win, so a risky item stays hidden
//      even if its id is on the list.
// Anything new from a supplier waits as "pending" until its id is added here. The protected debug
// report (PRODUCTS_DEBUG_TOKEN, above) lists the pending and held items with their ids.
// To approve a product: add its id on a new line. To hide one again: delete its line.
// This list is temporary; the planned database replaces it with an approve button in the admin area.
const HOLD_RULES = [
  { reason: "nicotine or tobacco product", pattern: /nicotine|\bnic\b|\bvapes?\b|vaping|e-?cig|e-?liquid|\d[\d,]*\s*puffs?\b|tobacco|cigarette|hookah|shisha/i },
  { reason: "weapon or self-defence product", pattern: /self[\s-]*defen[cs]e|stun\s*gun|taser|pepper\s*spray|brass\s*knuckles?|knuckle\s*dusters?|tactical\s*baton|expandable\s*baton|firearm|\bgun\b|ammunition|\bbullet\b|crossbow|\bsword\b|machete|switchblade|combat\s*knife/i },
  { reason: "alcohol or recreational drug product", pattern: /\b(alcohol|beer|wine|vodka|whisky|whiskey|rum|gin|tequila)\b|\bcannabis\b|\bmarijuana\b|\bthc\b|\bcbd\b|magic\s*mushroom/i },
  { reason: "possibly counterfeit branded goods", pattern: /master\s*copy|replica|first\s*copy|mirror\s*copy|super\s*copy|\b1:1\b|\bclone\b/i },
];
const holdReason = name => HOLD_RULES.find(r => r.pattern.test(String(name || "")))?.reason || null;

// Reviewed on 30 Oct 2026: the Business Koro products that were live then, minus the five held below.
const APPROVED_SUPPLIER_PRODUCTS = new Set([
  "bk-22fb3fe4-4c41-470f-b0e0-79c3e1bb95f8", // Black Paisley Hoodie & Dropsoulder Combo
  "bk-869a8aa2-d9ad-4c40-a8aa-7f2c21c407ba", // Premium Solid Color Pullover Hoodie for Men Without Print Solid Colour
  "bk-2e355a6b-de46-4d95-bd9d-a7ff35be928f", // Shoe Cleaner Foam White Shoe Cleaning Kit with Brush & Towel
  "bk-5d0cba61-8242-4058-bc3e-aeca594d6a0a", // vintage glasses men & Women
  "bk-b0b6e6cc-1a32-467d-af62-6b52d260eb67", // Polygonal Men & Women Sunglasses
  "bk-c199c491-52f3-4e8c-876e-0ed1957b73f6", // VEN-DENS VD-PB030 10000mAh Wireless Power Bank with Magsafe
  "bk-07c50511-6196-4a34-98e0-7a6df1ad0d9e", // X9 Handhole Game Console black hawk
  "bk-12a7bcab-f705-424d-9004-e4906359d005", // Hoco GA6 Glacier AI Semiconductor Mobile Cooler
  "bk-5a905a1e-1cdb-4d5e-974e-4236ae6bcd54", // BOYA BY-MW6 Wireless Lavalier Microphone – Dual Transmitter (original…
  "bk-1653fa52-7d49-4dca-a141-7deb1b4ab937", // Hoco M105 Sharp, wired gaming earphones with mic Original Base
  "bk-ef573f8b-e0dd-409b-97a7-29e89a8a4d75", // J36 Ultra Retro Handheld Game Console (100% Original)
  "bk-f6e03e61-20e1-4f95-af45-4c23065e72e9", // P6 Retro Game Console with 620 Classic Games & TV Support
  "bk-bafe6fe1-8e31-4eac-86b3-a26d77c64dce", // 10M ARGB Neon Rope Light – App & Remote Control(original)
  "bk-6a765b75-17bf-4536-ba64-5c111d376fa1", // K8 Wireless Earbuds
  "bk-4384f9fc-d380-4928-8272-03016151fc06", // Ven-Dens 50000mAh VD-PB063 22.5W Fast Charging Power Bank with Digita…
  "bk-e4f101cf-f9bb-426a-ac0c-db6c3f5a9ba3", // High Power Super Bright Flashlight 3.7V 30000mAh Sanford
  "bk-b06f5dc6-9a94-43e8-8112-5ca9ca14f641", // M88 LED Video Light
  "bk-d360e22c-8bd7-4ce2-ad14-f05694e4cfa8", // A59 Plus Watch Combo
  "bk-f1239262-5b37-43fb-93d2-21e563ad6232", // Ven-Dens VD-PB062 Power Bank – 30000mAh
  "bk-4b2a1773-5ad6-4fb7-9691-c96dda205d92", // VEN-DENS 20000mAh Power Bank
  "bk-6ebfa545-0faf-443a-897d-c599f38c38e7", // VEN-DENS 10000mAh Power Bank
  "bk-13a3d6a5-2a8a-4f8b-b655-9a84188682de", // OLAX M100 Power Bank WiFi Router
  "bk-e3db0798-61a4-4c77-86fb-7198b079c0ba", // 4G Pocket Router OLAX MF982
  "bk-12bb2a8f-b8d3-4697-bf5f-c8d04230661c", // Unique Design Strong quality Camping lamp light
  "bk-5bf0a59e-b77a-4ff1-a261-9201fa74a7e5", // Solar Interaction Wall Lamp
  "bk-dbac2722-5719-4162-aaf5-d7ea4ee935c5", // Portable Electric Kettle
  "bk-869e2a7b-1de1-4c2e-a892-6be9998e5ab6", // Plextone RX3 PLUS Wired Gaming Earphone
  "bk-30bfea0a-b349-429b-a091-9923621a4a81", // Siren Alarm Lock For Security
  "bk-f5ec0305-9aa9-4753-92c4-e54fe5980cc5", // Kemei Kemei KM-026
  "bk-e7e9c405-ff15-4dba-b3e9-23bae8f180e1", // Chest Strap Mount
  "bk-675007e7-97b4-4a4f-ad55-eae0e6855432", // MiLi MiTag Android and iphone Device – Compatible with Google’s Find …
  "bk-7dcf40fd-d7ff-4c0b-adab-e91e295c0b00", // 3D LED Digital Clock
  "bk-4e909f96-96cb-4791-858e-3644c9d8d732", // 5M Waterproof Outdoor USB 5V ARGB Neon Rope Light
  "bk-a79d3d6c-bdcd-4a6a-af14-c9a6457c0962", // JIO 4G LTE Mobile WiFi Hotspot Portable Router
  "bk-781d0a29-1ee6-41a2-b4e2-50d0cb582e00", // M25 Two-In-One Split Wireless DJ Speaker
  "bk-b029b246-f29b-4579-97fb-3da22acb4338", // R36s All-in-One Handheld Gaming Console
  "bk-70795826-a1d3-434f-8c86-f345595d8f18", // Android Smart Projector HY300 4K (ORIGINAL)
  "bk-5ff68125-f0d3-4b59-9522-2ff283e09fcc", // Mobile Phone Waterproof Box Bathroom Shower Phone Placement Box
  "bk-ab4f6153-46f3-4823-a07f-b7afc2543992", // EQ34 Plus Rima ANC+ENC TWS Earbud (App Supported) | Long 7-Hour Playt…
  "bk-68651b37-8f20-422c-b93d-e39a87156be2", // wgp Mini UPS 5/9/12V upgraded Original(10,400mAh)
  "bk-c9d7e032-5e9f-4e20-b0b4-7f4cce95861d", // FRB N27 [ 400 ঘন্টা ] Standby Time Wireless Neckband Bluetooth 5.3 Ea…
  "bk-ebd20ecb-7135-4f0a-9b59-95c7de8033fa", // 140W স্মার্ট ফুল চার্জ সেপারেটর
  "bk-caffd051-2609-4b4d-8b92-07201e981e0a", // Portable Smart Electric Grape Peeler Machine
  "bk-c2a8c5d6-073e-4562-8970-d8d72c0ad5ac", // Ultra S9 Android Smart Watch
  "bk-0dad4207-f4a3-408b-bfe5-38c69465af47", // Cordless Electric Screwdriver Tool Kit
  "bk-dcb9792b-a609-4377-af0a-c613fab8d847", // Memo CX07 Magnetic Phone Cooler Fan
  "bk-520d3230-558d-48b4-9ae3-91bb9c384b50", // MEMO CX12 Magnetic Phone Cooler Fan
  "bk-be24fb37-1c47-476f-8979-4377f5b757d4", // Mini Body Massage Gun SL-720 (original Version)
  "bk-cc90fd6a-3773-47fd-884c-7650692adebe", // F11-2 Dual Wireless Microphone Set
]);
// Held for review on 30 Oct 2026, so NOT in the list above:
//   bk-af958544-b780-4d5d-95eb-75845fc361ad  Zepter Kitchen Knife Set 6 Pcs (original)  — famous brand at a very low price; check it is genuine
//   bk-19f19e13-b6de-4b47-8384-47c00db29ce4  26 Inch Self Defense Stick  — self-defence product; a hold rule blocks it
//   bk-ecd85dc4-10a4-4c1a-9e93-0a5a46c41532  Yuoto Explorer 16000 Puffs | 50mg Nic Disposable | Type C Rechargeable  — nicotine product; a hold rule blocks it
//   bk-55b2a4b4-30f3-451b-b00a-64692c55c904  Apple Airpods Black Colour Special Edition MasterCopy  — possibly counterfeit branded goods; a hold rule blocks it
//   bk-2abd3e46-5020-4a5a-ba59-35f47da4ea1e  Apple Airpods pro 2nd generation MasterCopy  — possibly counterfeit branded goods; a hold rule blocks it

// split supplier products into what the shop may show, what waits for review, and what is held back
function reviewProducts(list) {
  const published = [], pending = [], held = [];
  for (const p of list) {
    const reason = holdReason(p.name);
    if (reason) held.push({ id: p.id, name: p.name, supplier: p.supplier, reason });
    else if (APPROVED_SUPPLIER_PRODUCTS.has(p.id)) published.push(p);
    else pending.push({ id: p.id, name: p.name, supplier: p.supplier, price: p.price });
  }
  return { published, pending, held };
}

// The debug report is only for whoever holds PRODUCTS_DEBUG_TOKEN. Both values are hashed and
// compared in constant time, so the check itself gives nothing away about the token.
const debugAllowed = (given, env) => {
  const token = clean(env.PRODUCTS_DEBUG_TOKEN);
  if (token.length < 16 || !given) return false; // not set, or too short to be safe: debug stays off
  const a = createHash("sha256").update(token).digest();
  const b = createHash("sha256").update(String(given)).digest();
  return timingSafeEqual(a, b);
};

// ─────────────────────────────────────────────────────────────
//  Mohasagor
// ─────────────────────────────────────────────────────────────
async function fetchMohasagor(debug, budget, env) {
  const key = clean(env.DROPSHIP_API_KEY);
  const secret = clean(env.DROPSHIP_SECRET_KEY);
  if (!key || !secret) return { configured: false, products: [], raw: [], error: null };

  const imageBase = (env.DROPSHIP_IMAGE_BASE || "https://mohasagor.com.bd/").replace(/\/*$/, "/");
  const markupPct = num(env.DROPSHIP_MARKUP_PERCENT);
  const markupFlat = num(env.DROPSHIP_MARKUP_FLAT);
  const maxPages = Math.max(1, num(env.DROPSHIP_MAX_PAGES) || 100);
  let catMap = {};
  try { catMap = JSON.parse(env.DROPSHIP_CATEGORY_MAP || "{}"); } catch { catMap = {}; }

  const url = path => {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    return imageBase + String(path).replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/");
  };

  const fetchPage = async pg => {
    if (!budget.take()) throw outOfCalls();
    const r = await fetch(`${mohasagorUrl(env)}?page=${pg}`, {
      headers: { "api-key": key, "secret-key": secret, Accept: "application/json" },
    });
    if (!r.ok) {
      // keep the supplier's own message (shown only in the protected debug report) so a rejected key is easy to diagnose
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
    // never plan more pages than the call allowance can pay for
    const lastPage = Math.min(trueLastPage, maxPages, 1 + Math.max(0, budget.left));
    let fetched = 1;
    for (let start = 2; start <= lastPage; start += BATCH) {
      const pages = [];
      for (let pg = start; pg < start + BATCH && pg <= lastPage; pg++) pages.push(pg);
      const batch = await Promise.all(pages.map(pg => fetchPage(pg).catch(() => null)));
      batch.forEach(d => { if (d) { raw.push(...pickList(d)); fetched++; } });
    }
    const truncated = lastPage < Math.min(trueLastPage, maxPages);

    // Show everything except products explicitly marked inactive or out of stock.
    // Most of this supplier's catalog has a blank stock_status, which we treat as sellable.
    // Set DROPSHIP_IN_STOCK_ONLY=1 to list ONLY items explicitly marked "available".
    const inStockOnly = /^(1|true|yes)$/i.test(String(env.DROPSHIP_IN_STOCK_ONLY || ""));
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
        const field = (env.DROPSHIP_PRICE_FIELD || "price").trim();
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

    return { configured: true, products, raw, error: null, pagesFetched: fetched, lastPage: trueLastPage, truncated };
  } catch (err) {
    const error = { message: String(err && err.message || err) };
    if (debug && err && err.body) error.supplierSays = err.body;
    if (debug) {
      const rawVals = { apiKey: String(env.DROPSHIP_API_KEY || ""), secretKey: String(env.DROPSHIP_SECRET_KEY || "") };
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
async function fetchBusinessKoro(debug, budget, env) {
  const apiKey = clean(env.BUSINESSKORO_API_KEY);
  if (!apiKey) return { configured: false, products: [], raw: [], error: null };

  const domain = clean(env.BUSINESSKORO_DOMAIN);
  const markupPct = num(env.BUSINESSKORO_MARKUP_PERCENT);
  const markupFlat = num(env.BUSINESSKORO_MARKUP_FLAT);

  const headers = { "x-api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" };
  if (domain) headers["x-domain"] = domain;

  // their /storefront/products endpoint is a flat { data: [...] } list (no pagination documented),
  // but we follow a Laravel-style meta.last_page / links.next if present, just in case, capped for safety
  const fetchPage = async pg => {
    if (!budget.take()) throw outOfCalls();
    const base = businessKoroUrl(env);
    const sep = base.includes("?") ? "&" : "?";
    const r = await fetch(pg > 1 ? `${base}${sep}page=${pg}` : base, { headers });
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
    const lastPage = Math.min(trueLastPage, 50, 1 + Math.max(0, budget.left)); // safety cap, and the call allowance
    let fetched = 1;
    for (let pg = 2; pg <= lastPage; pg++) {
      const d = await fetchPage(pg).catch(() => null);
      if (d) { raw.push(...pickList(d)); fetched++; }
    }
    const truncated = lastPage < Math.min(trueLastPage, 50);

    // Fail closed: only explicitly in-stock supplier records may be published.
    // Missing/null stock flags are unknown, not proof of availability.
    const products = raw
      .filter(p => p.inStock === true)
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

    return { configured: true, products, raw, error: null, pagesFetched: fetched, lastPage: trueLastPage, truncated };
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

// One feed request, without any host-specific objects: takes the method, the full URL and the
// settings, and returns { status, headers, body }. api/products.js (Vercel) and worker/index.js
// (Cloudflare) turn that into their own kind of reply.
const reply = (status, headers, body) => ({ status, headers, body });

export async function productsResponse({ method, url, env }) {
  const config = env || {};
  if (method !== "GET" && method !== "HEAD") {
    return reply(405, { Allow: "GET, HEAD" }, { error: "Method not allowed" });
  }
  const requestUrl = new URL(url, "http://localhost");
  // Only two addresses are served: the plain feed, and ?debug=<token> for whoever holds the token.
  // Anything else (?debug without the right token, or a made-up ?x=1) is sent to the plain, cached
  // address, so the query string can't be used to skip the cache and make us call the suppliers
  // over and over. Vercel's own _vercel... parameters are left alone.
  const params = [...requestUrl.searchParams.keys()].filter(k => !k.startsWith("_vercel"));
  const debug = params.length > 0 && params.every(k => k === "debug") && debugAllowed(requestUrl.searchParams.get("debug"), config);
  if (params.length > 0 && !debug) {
    return reply(308, { "Cache-Control": "public, max-age=0, s-maxage=86400", Location: "/api/products" }, null);
  }

  // HEAD requests need headers only; never spend supplier API calls building a body that is discarded.
  if (method === "HEAD") {
    return reply(200, {
      "Cache-Control": debug ? "no-store" : "s-maxage=3600, stale-while-revalidate=86400",
    }, null);
  }

  // one shared allowance of supplier calls for this request. Both suppliers ask for their first
  // page straight away; extra pages then use whatever is left, so the total can't pass the limit.
  const limit = num(config.SUPPLIER_CALL_LIMIT) > 0 ? Math.floor(num(config.SUPPLIER_CALL_LIMIT)) : Infinity;
  const calls = makeBudget(limit);
  const [mohasagor, businessKoro] = await Promise.all([
    fetchMohasagor(debug, calls, config),
    fetchBusinessKoro(debug, calls, config),
  ]);

  if (!mohasagor.configured && !businessKoro.configured) {
    return reply(500, {}, { error: "No supplier is configured. Set DROPSHIP_API_KEY/DROPSHIP_SECRET_KEY and/or BUSINESSKORO_API_KEY in the host's settings." });
  }

  if (debug) {
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
        truncated: !!result.truncated,
        categories: label === "mohasagor" ? categories : undefined,
      };
    };
    const review = reviewProducts([...mohasagor.products, ...businessKoro.products]);
    return reply(200, { "Cache-Control": "no-store" }, {
      ok: true,
      supplierCalls: { limit: Number.isFinite(limit) ? limit : null, used: calls.used },
      mohasagor: summarize("mohasagor", mohasagor),
      businessKoro: summarize("businesskoro", businessKoro),
      combinedUsableCount: mohasagor.products.length + businessKoro.products.length,
      review: {
        published: review.published.length,
        pendingCount: review.pending.length,
        heldCount: review.held.length,
        pending: review.pending.slice(0, 300), // the first 300; approve them by id in this file
        held: review.held,
      },
    });
  }

  if (mohasagor.error && businessKoro.error) {
    // both configured suppliers failed — surface it like before
    return reply(502, { "Cache-Control": "s-maxage=60" }, {
      error: "Could not load supplier products.",
      mohasagor: mohasagor.error,
      businessKoro: businessKoro.error,
    });
  }

  // only reviewed supplier products reach the shop (see APPROVED_SUPPLIER_PRODUCTS)
  const all = reviewProducts([...mohasagor.products, ...businessKoro.products]).published;

  // Show all products by default, fashion (men/women/winter/kids) listed first.
  // Set DROPSHIP_MAX_PRODUCTS to a number to cap the combined total (fashion is
  // always kept in full, then other categories fill the rest up to that number).
  const maxEnv = num(config.DROPSHIP_MAX_PRODUCTS);
  const maxProducts = maxEnv > 0 ? maxEnv : Infinity;
  const FASHION = new Set(["hoodies", "mens", "womens", "winter", "kids"]);
  const fashion = all.filter(p => FASHION.has(p.cat));
  const others = all.filter(p => !FASHION.has(p.cat));
  const products = fashion.concat(others).slice(0, Math.max(maxProducts, fashion.length));

  // cache at the edge for an hour and keep serving it for a day while it refreshes in the
  // background, so each supplier is asked rarely (they rate-limit / may block keys that call too often)
  return reply(200, { "Cache-Control": "s-maxage=3600, stale-while-revalidate=86400" }, {
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
