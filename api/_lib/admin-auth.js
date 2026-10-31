// Supabase-backed admin authentication for the Vercel API.
// Admin access is an email allowlist plus a verified Supabase Auth user.
// The browser receives only an HttpOnly, host-only access-token cookie; the
// refresh token is deliberately never returned to or stored by the browser.
const COOKIE = "oc_admin_session";
const DEFAULT_SUPABASE_URL = "https://kwhvbxwpnsminfxlxauh.supabase.co";
const MAX_SESSION_SECONDS = 60 * 60;

export function adminEmails(env = process.env) {
  return String(env.ADMIN_EMAILS || "")
    .split(",")
    .map(email => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedAdminEmail(email, env = process.env) {
  if (typeof email !== "string" || !email.trim()) return false;
  return adminEmails(env).includes(email.trim().toLowerCase());
}

function authConfig(env = process.env) {
  const url = String(env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, "");
  const key = env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (!key) throw new Error("SUPABASE_ANON_KEY is not configured");
  return { url, key };
}

async function authRequest(path, { method = "GET", body, accessToken, env = process.env } = {}) {
  const { url, key } = authConfig(env);
  const headers = { apikey: key, Accept: "application/json" };
  if (body) headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const response = await fetch(`${url}/auth/v1/${path}`, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}

export async function requestAdminOtp(email, env = process.env) {
  const normalized = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!isAllowedAdminEmail(normalized, env)) return { accepted: true };
  const { response } = await authRequest("otp", {
    method: "POST",
    body: { email: normalized, create_user: false },
    env,
  });
  if (!response.ok) {
    const error = new Error("Could not send a sign-in code");
    error.status = response.status;
    throw error;
  }
  return { accepted: true };
}

export async function verifyAdminOtp(email, token, env = process.env) {
  const normalized = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!isAllowedAdminEmail(normalized, env)) return null;
  if (typeof token !== "string" || !/^\d{6}$/.test(token.trim())) return null;

  const { response, data } = await authRequest("verify", {
    method: "POST",
    body: { email: normalized, token: token.trim(), type: "email" },
    env,
  });
  if (!response.ok || !data?.access_token || !isAllowedAdminEmail(data.user?.email, env)) return null;

  return {
    accessToken: data.access_token,
    email: data.user.email.trim().toLowerCase(),
    expiresIn: Math.min(MAX_SESSION_SECONDS, Math.max(60, Number(data.expires_in) || MAX_SESSION_SECONDS)),
  };
}

function readCookie(req, name) {
  const raw = req.headers?.cookie || "";
  for (const part of raw.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return "";
}

export async function getAdminSession(req, env = process.env) {
  const accessToken = readCookie(req, COOKIE);
  if (!accessToken || !/^[A-Za-z0-9._~-]{20,4096}$/.test(accessToken)) return null;

  const { response, data } = await authRequest("user", { accessToken, env });
  if (!response.ok || !isAllowedAdminEmail(data?.email, env)) return null;
  return { id: data.id, email: data.email.trim().toLowerCase() };
}

export function setAdminSessionCookie(res, req, session) {
  const secure = process.env.NODE_ENV === "production" || req.headers?.["x-forwarded-proto"] === "https";
  const attributes = [
    `${COOKIE}=${session.accessToken}`,
    "Path=/api/admin",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${session.expiresIn}`,
  ];
  if (secure) attributes.push("Secure");
  res.setHeader("Set-Cookie", attributes.join("; "));
}

export function clearAdminSessionCookie(res, req) {
  const secure = process.env.NODE_ENV === "production" || req.headers?.["x-forwarded-proto"] === "https";
  const attributes = [`${COOKIE}=`, "Path=/api/admin", "HttpOnly", "SameSite=Strict", "Max-Age=0", "Expires=Thu, 01 Jan 1970 00:00:00 GMT"];
  if (secure) attributes.push("Secure");
  res.setHeader("Set-Cookie", attributes.join("; "));
}

export async function revokeAdminSession(req, env = process.env) {
  const accessToken = readCookie(req, COOKIE);
  if (!accessToken || !/^[A-Za-z0-9._~-]{20,4096}$/.test(accessToken)) return;
  try {
    await authRequest("logout", { method: "POST", accessToken, env });
  } catch {
    // Clearing the browser cookie remains the primary local logout action.
  }
}

export function isSameOriginRequest(req) {
  const origin = req.headers?.origin;
  const host = req.headers?.host || req.headers?.["x-forwarded-host"];
  if (!origin || !host) return false;
  try {
    const parsed = new URL(origin);
    return parsed.host.toLowerCase() === String(host).toLowerCase() &&
      (parsed.protocol === "https:" || parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1");
  } catch {
    return false;
  }
}
