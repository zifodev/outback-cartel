// Supabase client for server-side (service-role) use only.
// Never import this file in browser code.

/**
 * Build headers for Supabase REST API calls using the service role key.
 * The service role key bypasses RLS — it must only be used in server-side
 * functions and must never be exposed to the browser.
 */
export function supabaseHeaders(env) {
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

/**
 * Return the Supabase REST base URL.
 */
export function supabaseUrl(env) {
  return env.SUPABASE_URL || "https://kwhvbxwpnsminfxlxauh.supabase.co";
}

/**
 * Execute a Supabase RPC (stored function) or a raw PostgREST query.
 * For order insertion we use the REST API directly.
 */
export async function supabasePost(env, table, body) {
  const url = `${supabaseUrl(env)}/rest/v1/${table}`;
  const res = await fetch(url, {
    method: "POST",
    headers: supabaseHeaders(env),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.message || data?.error || `Supabase ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.code = data?.code;
    throw err;
  }
  return data;
}

/**
 * Query rows from a Supabase table via GET.
 */
export async function supabaseGet(env, table, query = "") {
  const url = `${supabaseUrl(env)}/rest/v1/${table}?${query}`;
  const headers = supabaseHeaders(env);
  // For reads we don't need return=representation
  headers.Prefer = "";
  const res = await fetch(url, { method: "GET", headers });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.message || data?.error || `Supabase ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

/**
 * Execute raw SQL via Supabase's /rest/v1/rpc endpoint.
 * Requires `rpc` function on the database — but since we can't create those
 * without a migration, we'll use the PostgREST insert approach instead.
 */
