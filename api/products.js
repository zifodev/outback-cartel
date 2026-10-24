/* global process */
// ─────────────────────────────────────────────────────────────
//  /api/products — Vercel serverless function (runs on the server)
//
//  Fetches your supplier's products from the dropshipping.com.bd /
//  mohasagor reseller API and returns a clean list to your website.
//  The API key and secret key NEVER reach the browser: they are read
//  from Vercel → Project → Settings → Environment Variables:
//
//    DROPSHIP_API_KEY        (required)  your API key
//    DROPSHIP_SECRET_KEY     (required)  your secret key
//    DROPSHIP_MARKUP_PERCENT (optional)  e.g. 20 → add 20% to every price
//    DROPSHIP_MARKUP_FLAT    (optional)  e.g. 100 → add ৳100 to every price
//    DROPSHIP_IMAGE_BASE     (optional)  where product images live,
//                                        default https://mohasagor.com.bd/
//    DROPSHIP_CATEGORY_MAP   (optional)  JSON mapping supplier category_id
//                                        to your site's category keys,
//                                        e.g. {"1":"clothing","5":"home"}
//    DROPSHIP_MAX_PAGES      (optional)  safety limit, default 10 (×200 products)
//
//  Visit /api/products?debug=1 on your site to check the connection.
// ─────────────────────────────────────────────────────────────
const API_URL = "https://mohasagor.com.bd/api/reseller/product";

const num = v => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const stripHtml = html =>
  String(html || "")
    .replace(/<\/(li|p|div|br)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .split("\n").map(s => s.trim()).filter(Boolean).join("\n");

// the API returns { status, products: [...] } — also accept a paginated { products: { data: [...] } } shape
const pickList = data => {
  if (Array.isArray(data?.products)) return data.products;
  if (Array.isArray(data?.products?.data)) return data.products.data;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};
const pickLastPage = data =>
  num(data?.last_page ?? data?.products?.last_page ?? data?.meta?.last_page ?? data?.pagination?.last_page) || 1;

// supplier category names → this site's category keys (first matching rule wins)
const CATEGORY_RULES = [
  [/phone|mobile|charger|cable|case|cover/i, "accessories"],
  [/watch/i, "watches"],
  [/gaming|game/i, "gaming"],
  [/gadget|electronic|computer|laptop|audio|headphone|earphone|speaker/i, "electronics"],
  [/beauty tech|trimmer|shaver|massager/i, "beautytech"],
  [/beauty|health|cosmetic|skin|hair|personal care/i, "beauty"],
  [/travel|luggage/i, "travel"],
  [/bag|backpack|wallet/i, "bags"],
  [/office|desk|stationery/i, "homeoffice"],
  [/fashion|cloth|men|women|saree|panjabi|shirt|hoodie|dress|shoe|jewel/i, "clothing"],
  [/home|kitchen|lifestyle|decor|furniture|household/i, "home"],
  [/sport|fitness|gym|outdoor/i, "sports"],
  [/toy|kid|baby/i, "toys"],
];
const guessCategory = name => {
  const n = String(name || "");
  for (const [re, key] of CATEGORY_RULES) if (re.test(n)) return key;
  return "dropship";
};

export default async function handler(req, res) {
  const key = process.env.DROPSHIP_API_KEY;
  const secret = process.env.DROPSHIP_SECRET_KEY;
  if (!key || !secret) {
    res.status(500).json({ error: "DROPSHIP_API_KEY and DROPSHIP_SECRET_KEY are not set in Vercel Environment Variables." });
    return;
  }

  const imageBase = (process.env.DROPSHIP_IMAGE_BASE || "https://mohasagor.com.bd/").replace(/\/*$/, "/");
  const markupPct = num(process.env.DROPSHIP_MARKUP_PERCENT);
  const markupFlat = num(process.env.DROPSHIP_MARKUP_FLAT);
  const maxPages = Math.max(1, num(process.env.DROPSHIP_MAX_PAGES) || 10);
  let catMap = {};
  try { catMap = JSON.parse(process.env.DROPSHIP_CATEGORY_MAP || "{}"); } catch { catMap = {}; }

  const url = path => {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    return imageBase + String(path).replace(/^\/+/, "").split("/").map(encodeURIComponent).join("/");
  };

  try {
    const raw = [];
    let page = 1, lastPage = 1;
    do {
      const r = await fetch(`${API_URL}?page=${page}`, {
        headers: { "api-key": key, "secret-key": secret, Accept: "application/json" },
      });
      if (!r.ok) throw new Error(`Supplier API answered ${r.status}`);
      const data = await r.json();
      const list = pickList(data);
      raw.push(...list);
      lastPage = pickLastPage(data);
      if (list.length === 0) break;
      page += 1;
    } while (page <= lastPage && page <= maxPages);

    if (req.query && req.query.debug) {
      // connection check: shows how many products came back and one raw example (no keys)
      res.setHeader("Cache-Control", "no-store");
      const categories = {};
      raw.forEach(p => { const c = p.category || p.category_name || p.category_id || "?"; categories[c] = (categories[c] || 0) + 1; });
      res.status(200).json({ ok: true, count: raw.length, pagesFetched: page - 1, lastPage, categories, sample: raw[0] || null });
      return;
    }

    const products = raw
      .filter(p => (p.status === undefined || p.status === "active" || p.status === 1 || p.status === 3) &&
                   (p.stock_status === undefined || p.stock_status === "available"))
      .map(p => {
      // reselling_price is the supplier's suggested selling price; fall back to sale_price / price
      const base = num(p.reselling_price) || num(p.sale_price) || num(p.price);
      const price = Math.round(base * (1 + markupPct / 100) + markupFlat);
      const regular = num(p.price) > price ? num(p.price) : null;
      const imgList = Array.isArray(p.product_images) ? p.product_images : Array.isArray(p.product_image) ? p.product_image : [];
      const images = imgList
        .map(im => url(im && im.product_image))
        .filter(Boolean);
      return {
        id: `ds-${p.id}`,
        remote: true,
        supplierId: p.id,
        code: p.product_code ?? null,
        slug: p.slug || "",
        name: String(p.name || "Product").trim(),
        cat: catMap[String(p.category_id)] || catMap[String(p.category)] || guessCategory(p.category || p.category_name),
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
        details: stripHtml(p.details),
      };
    }).filter(p => p.price > 0);

    // cache on Vercel's edge for 15 minutes, serve stale for up to an hour while refreshing
    res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600");
    res.status(200).json({ products, updatedAt: new Date().toISOString() });
  } catch (err) {
    res.status(502).json({ error: "Could not load supplier products.", detail: String(err && err.message || err) });
  }
}
