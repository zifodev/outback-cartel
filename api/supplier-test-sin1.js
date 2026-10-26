// temporary: checks whether the supplier accepts our key when asked from this Vercel region
export const config = { runtime: "edge", regions: ["sin1"] };
export default async function handler() {
  const clean = v => String(v || "").trim().replace(/^["']+|["']+$/g, "").trim();
  const key = clean(process.env.DROPSHIP_API_KEY), secret = clean(process.env.DROPSHIP_SECRET_KEY);
  let ip = "";
  try { ip = (await (await fetch("https://api.ipify.org?format=json")).json()).ip; } catch { ip = "?"; }
  const out = { region: "sin1", ip };
  for (const [name, ua] of [["default", null], ["browser", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"]]) {
    try {
      const h = { "api-key": key, "secret-key": secret, Accept: "application/json" };
      if (ua) h["User-Agent"] = ua;
      const r = await fetch("https://mohasagor.com.bd/api/reseller/product?page=1", { headers: h });
      out[name] = { status: r.status, url: r.url, redirected: r.redirected, body: (await r.text()).replace(/\s+/g, " ").slice(0, 160) };
    } catch (e) { out[name] = "failed: " + String(e && e.message || e); }
  }
  return new Response(JSON.stringify(out), { headers: { "content-type": "application/json", "cache-control": "no-store" } });
}
