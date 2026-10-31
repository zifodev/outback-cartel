// Lightweight, privacy-conscious campaign analytics.
//
// - No accounts, no fingerprinting, no PII: just a random id held in this
//   tab's sessionStorage for the length of the visit.
// - UTM parameters (utm_source, utm_medium, utm_campaign, utm_content,
//   utm_term) are captured once, from the URL that first brought the visitor
//   in, and reused for the rest of the session — so an event fired after
//   they've clicked into the shop (e.g. "add to cart") can still be
//   attributed to the ad that brought them here.
// - Events are sent to our own /api/track endpoint, which writes them
//   server-side with the service-role key (same pattern as api/orders.js) —
//   never directly from the browser.
// - Fire-and-forget: never throws, never retries, never blocks the UI.
//   A failed or slow network request here must never be visible to a shopper.

const SESSION_KEY = "oc_session_id";
const UTM_KEY = "oc_utm";
const UTM_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

function getSessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = (typeof crypto !== "undefined" && crypto.randomUUID)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return null; // sessionStorage unavailable (private mode, etc.) — events still send, just unlinked
  }
}

function captureUtm() {
  try {
    const params = new URLSearchParams(window.location.search);
    const found = {};
    let any = false;
    for (const field of UTM_FIELDS) {
      const value = params.get(field);
      if (value) { found[field] = value.slice(0, 150); any = true; }
    }
    if (any) {
      sessionStorage.setItem(UTM_KEY, JSON.stringify(found));
      return found;
    }
    const saved = sessionStorage.getItem(UTM_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

/**
 * Record one analytics event. Safe to call from anywhere in the app —
 * never throws, never awaited, never shown to the shopper.
 */
export function track(eventType, extra = {}) {
  try {
    const body = {
      eventType,
      path: window.location.pathname,
      sessionId: getSessionId(),
      referrer: document.referrer || null,
      ...captureUtm(),
      ...extra,
    };
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true, // let the request finish even if this is a page unload (e.g. WhatsApp click)
    }).catch(() => {});
  } catch {
    // Analytics must never break the shop.
  }
}
