// POST /api/track — record one campaign-analytics event (page view,
// add-to-cart, or a WhatsApp click) to Supabase.
//
// This endpoint must never affect the shopping experience: it always
// responds quickly and quietly, even when nothing was saved (database not
// configured, bad payload, Supabase error). The client (src/lib/analytics.js)
// already fires these fire-and-forget and ignores the response.

import { supabasePost } from "./_lib/supabase.js";

export const config = { maxDuration: 10 };

const EVENT_TYPES = new Set(["page_view", "add_to_cart", "whatsapp_click"]);

const clean = (value, max) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
};

export default async function handler(req, res) {
  const done = () => { res.statusCode = 204; res.end(); };

  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return done();
  }

  // eslint-disable-next-line no-undef -- process.env is provided by Vercel's Node runtime
  const env = process.env;
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return done(); // no database configured — drop silently

  const body = req.body;
  if (!body || typeof body !== "object") return done();

  const eventType = clean(body.eventType, 40);
  if (!eventType || !EVENT_TYPES.has(eventType)) return done();

  const price = Number(body.price);
  const row = {
    event_type: eventType,
    path: clean(body.path, 300),
    view: clean(body.view, 300),
    session_id: clean(body.sessionId, 100),
    referrer: clean(body.referrer, 500),
    utm_source: clean(body.utm_source, 100),
    utm_medium: clean(body.utm_medium, 100),
    utm_campaign: clean(body.utm_campaign, 150),
    utm_content: clean(body.utm_content, 150),
    utm_term: clean(body.utm_term, 150),
    meta: {
      productId: clean(body.productId, 100),
      name: clean(body.name, 150),
      price: Number.isFinite(price) ? price : null,
      href: clean(body.href, 300),
    },
  };

  try {
    await supabasePost(env, "oc_events", row);
  } catch (err) {
    // Analytics failures are never the shopper's problem — log and move on.
    console.error("Track event error:", err.message);
  }
  return done();
}
