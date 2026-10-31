// /api/products on Vercel: a thin wrapper. All the feed logic lives in api/_lib/products-core.js,
// which the Cloudflare Worker (worker/index.js) also uses, so both hosts behave the same.
import { productsResponse } from "./_lib/products-core.js";

// allow up to 60s on the server to gather every page (Vercel function limit)
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  // req.url is read directly (not req.query), which avoids Node's deprecated url.parse() warning
  const r = await productsResponse({ method: req.method, url: req.url, env: process.env });
  for (const [k, v] of Object.entries(r.headers)) res.setHeader(k, v);
  if (r.body === null || req.method === "HEAD") { res.status(r.status).end(); return; }
  res.status(r.status).json(r.body);
}
