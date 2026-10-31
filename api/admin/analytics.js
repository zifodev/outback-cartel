// GET /api/admin/analytics — a simple read-only summary of the oc_events
// table (page views, add-to-carts, WhatsApp clicks, campaign/product
// breakdowns) for the admin panel's Analytics tab.
//
// Protected by ADMIN_PASSWORD env var, same as api/admin/orders.js.
// This file runs as a Vercel serverless function.

import { supabaseGet } from "../_lib/supabase.js";
import { isAdminAuthenticated } from "../_lib/admin-auth.js";

export const config = { maxDuration: 15 };

const json = (res, status, body) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(status).end(JSON.stringify(body));
};

const err = (res, status, message) => json(res, status, { error: message });

// Bound how far back we look — oc_events has no index that would make an
// unbounded scan cheap, and nobody needs more than a few months of this on
// one screen.
const MAX_DAYS = 90;
const DEFAULT_DAYS = 30;
const ROW_LIMIT = 8000; // generous for this site's current traffic; events older than that within the window are simply not counted, never an error

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(204).end();
  }
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return err(res, 405, "Method not allowed");
  }
  if (!isAdminAuthenticated(req)) return err(res, 401, "Unauthorized");

  const env = process.env;
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return err(res, 503, "Database is not configured");

  const requestUrl = new URL(req.url, "http://localhost");
  const daysParam = Number(requestUrl.searchParams.get("days"));
  const days = Number.isFinite(daysParam) && daysParam > 0 ? Math.min(MAX_DAYS, Math.floor(daysParam)) : DEFAULT_DAYS;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  let rows;
  try {
    rows = await supabaseGet(env, "oc_events",
      `select=event_type,view,utm_source,utm_medium,utm_campaign,meta,created_at` +
      `&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&limit=${ROW_LIMIT}`
    );
  } catch (e) {
    console.error("Admin analytics error:", e.message);
    return err(res, 500, "Could not load analytics");
  }

  const totals = { page_view: 0, add_to_cart: 0, whatsapp_click: 0 };
  const campaigns = new Map(); // key: source|campaign -> { source, medium, campaign, page_view, add_to_cart, whatsapp_click }
  const products = new Map(); // key: productId or name -> { name, add_to_cart }
  const byDay = new Map(); // "YYYY-MM-DD" -> { page_view, add_to_cart }

  for (const r of rows) {
    const type = r.event_type;
    if (totals[type] !== undefined) totals[type]++;

    const day = String(r.created_at).slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, { page_view: 0, add_to_cart: 0 });
    if (type === "page_view" || type === "add_to_cart") byDay.get(day)[type]++;

    if (r.utm_campaign || r.utm_source) {
      const key = `${r.utm_source || "(none)"}|${r.utm_campaign || "(none)"}`;
      if (!campaigns.has(key)) campaigns.set(key, { source: r.utm_source || "(none)", medium: r.utm_medium || null, campaign: r.utm_campaign || "(none)", page_view: 0, add_to_cart: 0, whatsapp_click: 0 });
      const c = campaigns.get(key);
      if (c[type] !== undefined) c[type]++;
    }

    if (type === "add_to_cart" && r.meta) {
      const name = r.meta.name || r.meta.productId || "Unknown product";
      if (!products.has(name)) products.set(name, { name, add_to_cart: 0 });
      products.get(name).add_to_cart++;
    }
  }

  const campaignList = [...campaigns.values()].sort((a, b) => (b.page_view + b.add_to_cart) - (a.page_view + a.add_to_cart)).slice(0, 25);
  const productList = [...products.values()].sort((a, b) => b.add_to_cart - a.add_to_cart).slice(0, 25);
  const dailySeries = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, v]) => ({ day, ...v }));

  return json(res, 200, {
    windowDays: days,
    sampledRows: rows.length,
    truncated: rows.length >= ROW_LIMIT,
    totals,
    campaigns: campaignList,
    products: productList,
    dailySeries,
  });
}
