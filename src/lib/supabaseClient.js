// Browser Supabase client — used only for real customer authentication (email OTP).
// Uses the PUBLIC anon key, which is safe to ship to the browser: it has no special
// privileges and every table it can touch is locked down by Row Level Security.
// It is never used to read or write orders/products directly — those go through our
// own server endpoints (api/orders.js, api/admin/orders.js) using the service role key,
// which stays server-side only.
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// If these aren't configured, auth features degrade gracefully (see AuthModal) rather
// than crashing the whole storefront — shopping without an account still works.
export const supabaseConfigured = Boolean(url && anonKey);

export const supabase = supabaseConfigured
  ? createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;
