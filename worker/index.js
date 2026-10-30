// ─────────────────────────────────────────────────────────────
//  Cloudflare Worker: COMPATIBILITY TEST ONLY (branch task-2-cloudflare-test)
//
//  The live shop stays on Vercel. This Worker serves the same build on a free Cloudflare
//  test address so the shop can be checked there before any decision to move.
//
//  - Shop pages, the 3D showroom, the 2D fallback and images are static files (dist/).
//    Cloudflare serves them directly; they never start this Worker and don't count
//    towards the free plan's 100,000 requests a day.
//  - Only /api/... starts the Worker. /api/products runs exactly the same feed code as
//    Vercel (api/_lib/products-core.js).
//
//  Caching the product feed (Vercel's CDN did this for us):
//    fresh for 1 hour, then served "stale" for up to 1 day while a new copy is fetched in
//    the background, so each supplier is asked about once an hour, not on every visit.
//    Stored in Workers KV when a FEED_CACHE namespace is linked (works on every address),
//    otherwise in Cloudflare's cache for this data centre.
//    FEED_CACHE_MODE (optional setting) forces one for testing: "kv", "cache" or "off".
//    Headers on every feed reply: X-Feed-Cache (hit, stale, miss or off), X-Feed-Store
//    (kv, cache or off) and X-Feed-Age (seconds since the stored copy was made).
// ─────────────────────────────────────────────────────────────
import { productsResponse } from "../api/_lib/products-core.js";

const FRESH_SECONDS = 3600;     // serve the stored feed as is for an hour
const STALE_SECONDS = 86400;    // after that, still serve it for a day while refreshing
const CACHE_KEY = "products-feed-v1";

// Cloudflare's free plan allows 50 outgoing calls per request; keep a margin
const withDefaults = env => ({ SUPPLIER_CALL_LIMIT: "40", ...env });

const toResponse = (r, method) => {
  const headers = new Headers(r.headers);
  if (r.body === null) return new Response(null, { status: r.status, headers });
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(method === "HEAD" ? null : JSON.stringify(r.body), { status: r.status, headers });
};

// ── where the stored feed lives ──
function feedStore(env, origin) {
  const mode = String(env.FEED_CACHE_MODE || "auto").toLowerCase();
  if (mode === "off") return { kind: "off", async get() { return null; }, async put() {} };
  if (env.FEED_CACHE && mode !== "cache") {
    return {
      kind: "kv",
      async get() {
        const { value, metadata } = await env.FEED_CACHE.getWithMetadata(CACHE_KEY);
        return value ? { body: value, storedAt: Number(metadata?.storedAt) || 0 } : null;
      },
      async put(body) {
        await env.FEED_CACHE.put(CACHE_KEY, body, { metadata: { storedAt: Date.now() }, expirationTtl: STALE_SECONDS + FRESH_SECONDS });
      },
    };
  }
  const key = new Request(`${origin}/__feed-cache/${CACHE_KEY}`);
  return {
    kind: "cache",
    async get() {
      const hit = await caches.default.match(key);
      return hit ? { body: await hit.text(), storedAt: Number(hit.headers.get("X-Stored-At")) || 0 } : null;
    },
    async put(body) {
      await caches.default.put(key, new Response(body, {
        headers: { "Content-Type": "application/json", "Cache-Control": `public, max-age=${STALE_SECONDS + FRESH_SECONDS}`, "X-Stored-At": String(Date.now()) },
      }));
    },
  };
}

const feedReply = (body, state, method, store, age) => new Response(method === "HEAD" ? null : body, {
  status: 200,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    // browsers may keep it 5 minutes; the Worker's own store does the long caching
    "Cache-Control": "public, max-age=300",
    "X-Feed-Cache": store.kind === "off" ? "off" : state,
    "X-Feed-Store": store.kind,
    "X-Feed-Age": String(Math.max(0, Math.round(age))),
  },
});

async function freshFeed(request, env) {
  return productsResponse({ method: "GET", url: request.url, env: withDefaults(env) });
}

async function products(request, env, ctx) {
  const url = new URL(request.url);
  const keys = [...url.searchParams.keys()];
  const readMethod = request.method === "GET" || request.method === "HEAD";

  // Any query string except ?debug=... is sent to the plain address, as on Vercel. This also
  // covers Vercel's own _vercel... names, which mean nothing here: letting them through would
  // let anyone skip the stored feed and make us call the suppliers on every request.
  if (readMethod && keys.length > 0 && !keys.every(k => k === "debug")) {
    return new Response(null, { status: 308, headers: { Location: "/api/products", "Cache-Control": "public, max-age=0, s-maxage=86400" } });
  }

  // the debug report and wrong methods go straight to the shared code, which checks the
  // token or refuses the method exactly as on Vercel
  if (!readMethod || keys.length > 0) {
    return toResponse(await productsResponse({ method: request.method, url: request.url, env: withDefaults(env) }), request.method);
  }

  const store = feedStore(env, url.origin);
  const stored = await store.get().catch(() => null);
  const age = stored ? (Date.now() - stored.storedAt) / 1000 : Infinity;

  const refresh = async () => {
    const r = await freshFeed(request, env);
    if (r.status === 200) {
      const body = JSON.stringify(r.body);
      try { await store.put(body); } catch { /* the feed still answers, just uncached */ }
      return { r, body };
    }
    return { r, body: null };
  };

  if (stored && age < FRESH_SECONDS) return feedReply(stored.body, "hit", request.method, store, age);
  if (stored && age < STALE_SECONDS) {
    ctx.waitUntil(refresh().catch(() => {}));
    return feedReply(stored.body, "stale", request.method, store, age);
  }
  const { r, body } = await refresh();
  if (body) return feedReply(body, "miss", request.method, store, 0);
  return toResponse(r, request.method); // suppliers failed: same error reply as Vercel
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/products") return products(request, env, ctx);
    if (url.pathname.startsWith("/api/")) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
    }
    // not normally reached: static files are served before the Worker runs
    return env.ASSETS.fetch(request);
  },
};
