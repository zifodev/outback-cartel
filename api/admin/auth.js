// POST /api/admin/auth { action: "request" | "verify" | "logout" }
// GET  /api/admin/auth — validate the HttpOnly session cookie.
import {
  clearAdminSessionCookie,
  getAdminSession,
  isSameOriginRequest,
  requestAdminOtp,
  revokeAdminSession,
  setAdminSessionCookie,
  verifyAdminOtp,
} from "../_lib/admin-auth.js";

const json = (res, status, body) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.status(status).end(JSON.stringify(body));
};
const err = (res, status, message) => json(res, status, { error: message });

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "GET") {
    try {
      const session = await getAdminSession(req);
      return session ? json(res, 200, { authenticated: true, email: session.email })
        : json(res, 200, { authenticated: false });
    } catch (error) {
      console.error("Admin session check failed:", error.message);
      return err(res, 503, "Authentication service unavailable");
    }
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return err(res, 405, "Method not allowed");
  }
  if (!isSameOriginRequest(req)) return err(res, 403, "Cross-origin request rejected");

  const { action, email, token } = req.body || {};
  if (action === "request") {
    if (typeof email !== "string" || email.length > 254) return err(res, 400, "Enter a valid email address");
    try {
      // Return the same response for allowlisted and non-allowlisted addresses.
      await requestAdminOtp(email, process.env);
      return json(res, 200, { ok: true, message: "If this address is authorised, a sign-in code has been sent." });
    } catch (error) {
      console.error("Admin OTP request failed:", error.message);
      return err(res, 503, "Could not send a sign-in code. Try again later.");
    }
  }

  if (action === "verify") {
    if (typeof email !== "string" || typeof token !== "string") return err(res, 400, "Email and six-digit code are required");
    try {
      const session = await verifyAdminOtp(email, token, process.env);
      if (!session) return err(res, 401, "Invalid or expired sign-in code");
      setAdminSessionCookie(res, req, session);
      return json(res, 200, { ok: true, email: session.email });
    } catch (error) {
      console.error("Admin OTP verification failed:", error.message);
      return err(res, 503, "Authentication service unavailable");
    }
  }

  if (action === "logout") {
    await revokeAdminSession(req, process.env);
    clearAdminSessionCookie(res, req);
    return json(res, 200, { ok: true });
  }

  return err(res, 400, "Unknown authentication action");
}
