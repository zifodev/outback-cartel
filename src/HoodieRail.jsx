import { useState, useRef, useEffect, lazy, Suspense } from "react";
// every hoodie hangs side-on (like clothes on a wardrobe rail) and flips round to face you
const SPIN_REST = 87; // angle it hangs at (deg); it turns to 0° when you point at it

// ── A hoodie seen from the side: hood hanging down the back, sleeve in front with a ribbed
// cuff, drawstrings, ribbed hem and the pocket curving out at the front. One drawing,
// tinted with the hoodie's colour, so every hoodie on the rail hangs the same proper way.
const SIL = "M98 6 C58 2 8 40 6 118 C5 186 20 236 34 262 L31 446 C31 463 35 471 48 473 Q104 480 158 473 C171 471 176 463 177 450 C182 410 184 340 180 300 C176 240 172 150 172 44 C172 20 150 9 124 8 C114 6 106 5 98 6 Z";
const HOOD = "M98 6 C58 2 8 40 6 118 C5 186 20 236 34 262 C58 252 74 226 74 190 C72 120 84 60 104 30 C100 20 98 12 98 6 Z";
const SLV = "M86 44 C94 30 138 28 154 40 C158 140 154 300 149 438 C148 449 140 452 124 452 C108 452 100 449 99 440 C100 330 78 150 86 44 Z";
// very dark fabric is lifted a touch so its folds and softness still show
const softTone = hex => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return hex || "#3A3A3D";
  const n = parseInt(m[1], 16), rgb = [n >> 16, (n >> 8) & 255, n & 255];
  if ((0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255 > 0.14) return hex;
  return "#" + rgb.map((c, k) => Math.round(c + ([74, 72, 76][k] - c) * 0.16).toString(16).padStart(2, "0")).join("");
};
function SideHoodie({ id, tone }) {
  const u = k => `${k}${id}`, url = k => `url(#${u(k)})`;
  const c = softTone(tone);
  const dark = c !== tone || /^#?[0-3]/.test(c); // dark fabric shows grain more, so less of it
  const blur = (k, sd) => (
    <filter id={u(k)} filterUnits="userSpaceOnUse" x="-20" y="-20" width="230" height="530"><feGaussianBlur stdDeviation={sd} /></filter>
  );
  // soft, brushed-fleece grain (fine) and a gentle heathered unevenness (broad)
  const noise = (k, freq, oct, seed, slope, soft) => (
    <filter id={u(k)} filterUnits="userSpaceOnUse" x="0" y="0" width="190" height="490" colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={oct} seed={seed} />
      {soft ? <feGaussianBlur stdDeviation={soft} /> : null}
      <feColorMatrix type="saturate" values="0" />
      <feComponentTransfer>
        <feFuncR type="linear" slope={slope} intercept={0.5 - slope / 2} />
        <feFuncG type="linear" slope={slope} intercept={0.5 - slope / 2} />
        <feFuncB type="linear" slope={slope} intercept={0.5 - slope / 2} />
        <feFuncA type="linear" slope="0" intercept="1" />
      </feComponentTransfer>
    </filter>
  );
  const fabric = (
    <>
      <rect width="190" height="490" fill={c} />
      <rect width="190" height="490" filter={url("hz")} opacity={dark ? ".16" : ".22"} style={{ mixBlendMode: "soft-light" }} />
    </>
  );
  const grain = <rect width="190" height="490" filter={url("gz")} opacity={dark ? ".16" : ".24"} style={{ mixBlendMode: "soft-light" }} />;
  return (
    <svg className="rk-side" viewBox="0 0 190 490" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={u("sil")}><path d={SIL} /></clipPath>
        <clipPath id={u("slv")}><path d={SLV} /></clipPath>
        <linearGradient id={u("top")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff4e6" stopOpacity=".16" /><stop offset=".45" stopColor="#fff4e6" stopOpacity=".03" /><stop offset="1" stopColor="#000" stopOpacity=".14" />
        </linearGradient>
        <linearGradient id={u("cyl")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity=".2" /><stop offset=".16" stopColor="#000" stopOpacity=".03" />
          <stop offset=".42" stopColor="#fff" stopOpacity=".05" /><stop offset=".66" stopColor="#fff" stopOpacity=".09" />
          <stop offset=".88" stopColor="#000" stopOpacity=".08" /><stop offset="1" stopColor="#000" stopOpacity=".26" />
        </linearGradient>
        <linearGradient id={u("hood")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity=".08" /><stop offset=".55" stopColor="#000" stopOpacity=".02" /><stop offset="1" stopColor="#000" stopOpacity=".2" />
        </linearGradient>
        <radialGradient id={u("open")} cx=".55" cy=".42" r=".62">
          <stop offset="0" stopColor="#000" stopOpacity=".55" /><stop offset=".7" stopColor="#000" stopOpacity=".3" /><stop offset="1" stopColor="#000" stopOpacity=".08" />
        </radialGradient>
        <linearGradient id={u("slg")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity=".24" /><stop offset=".24" stopColor="#000" stopOpacity=".02" />
          <stop offset=".55" stopColor="#fff" stopOpacity=".1" /><stop offset=".86" stopColor="#000" stopOpacity=".07" /><stop offset="1" stopColor="#000" stopOpacity=".2" />
        </linearGradient>
        <linearGradient id={u("band")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".06" /><stop offset=".3" stopColor="#000" stopOpacity=".05" /><stop offset="1" stopColor="#000" stopOpacity=".2" />
        </linearGradient>
        <linearGradient id={u("agl")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#a9a392" /><stop offset=".45" stopColor="#f6f3ea" /><stop offset="1" stopColor="#938d7d" />
        </linearGradient>
        <pattern id={u("rib")} width="5" height="8" patternUnits="userSpaceOnUse">
          <rect width="2" height="8" fill="#000" opacity=".16" /><rect x="2.6" width="1.4" height="8" fill="#fff" opacity=".07" />
        </pattern>
        {noise("gz", ".6", 2, id * 7 + 3, 3.2, 0.42)}
        {noise("hz", ".03 .012", 3, id * 5 + 1, 2, 0)}
        {blur("b1", 1.4)}{blur("b3", 3.4)}{blur("b6", 7)}
      </defs>

      {/* body and hood */}
      <g clipPath={url("sil")}>
        {fabric}
        <rect width="190" height="490" fill={url("cyl")} />
        <rect width="190" height="490" fill={url("top")} />
        <path d={HOOD} fill={url("hood")} />
        <ellipse cx="38" cy="122" rx="24" ry="64" fill="#fff" opacity=".12" filter={url("b6")} />
        <path d="M104 30 C84 60 72 120 74 190 C74 226 58 252 34 262" fill="none" stroke="#000" strokeOpacity=".28" strokeWidth="4.5" filter={url("b1")} />
        <path d="M99 33 C79 63 67 120 69 188 C69 222 55 246 33 256" fill="none" stroke="#fff" strokeOpacity=".09" strokeWidth="3.5" filter={url("b1")} />
        <path d="M86 14 C102 6 124 10 138 28 C120 30 100 42 86 62 C78 46 78 26 86 14 Z" fill={url("open")} filter={url("b1")} />
        <path d={SLV} fill="#000" opacity=".28" transform="translate(-6 5)" filter={url("b3")} />
        <path d="M150 286 C168 296 178 340 174 392 C172 420 166 436 160 436" fill="none" stroke="#000" strokeOpacity=".22" strokeWidth="3" filter={url("b1")} />
        <path d="M154 289 C172 302 181 342 177 394" fill="none" stroke="#fff" strokeOpacity=".1" strokeWidth="2.4" filter={url("b1")} />
        <rect y="436" width="190" height="50" fill={url("band")} />
        <rect y="436" width="190" height="50" fill={url("rib")} />
        <rect y="429" width="190" height="5" fill="#fff" opacity=".07" filter={url("b1")} />
        <rect y="434" width="190" height="3" fill="#000" opacity=".2" filter={url("b1")} />
        <path d={SIL} fill="none" stroke="#000" strokeOpacity=".2" strokeWidth="14" filter={url("b6")} />
        {grain}
      </g>

      {/* the sleeve hanging in front */}
      <g clipPath={url("slv")}>
        {fabric}
        <rect width="190" height="490" fill={url("slg")} />
        <rect width="190" height="490" fill={url("top")} />
        <ellipse cx="122" cy="60" rx="26" ry="16" fill="#fff" opacity=".09" filter={url("b6")} />
        <path d="M90 232 Q120 260 154 226" fill="none" stroke="#000" strokeOpacity=".15" strokeWidth="8" filter={url("b3")} />
        <path d="M92 247 Q121 272 154 241" fill="none" stroke="#fff" strokeOpacity=".05" strokeWidth="6" filter={url("b3")} />
        <path d="M94 346 Q122 372 152 338" fill="none" stroke="#000" strokeOpacity=".13" strokeWidth="8" filter={url("b3")} />
        <path d="M96 360 Q123 384 152 352" fill="none" stroke="#fff" strokeOpacity=".05" strokeWidth="6" filter={url("b3")} />
        <rect y="410" width="190" height="50" fill={url("band")} />
        <rect y="410" width="190" height="50" fill={url("rib")} />
        <rect y="402" width="190" height="5" fill="#fff" opacity=".08" filter={url("b1")} />
        <rect y="408" width="190" height="3" fill="#000" opacity=".24" filter={url("b1")} />
        <path d={SLV} fill="none" stroke="#000" strokeOpacity=".2" strokeWidth="10" filter={url("b3")} />
        {grain}
      </g>
      <path d="M86 44 C94 30 138 28 154 40" fill="none" stroke="#000" strokeOpacity=".2" strokeWidth="2" filter={url("b1")} />
      <path d="M86 44 C78 150 100 330 99 440" fill="none" stroke="#000" strokeOpacity=".24" strokeWidth="2.4" filter={url("b1")} />

      {/* drawstrings */}
      {[["M146 28 C146.5 70 147.5 110 148 148", 148, 148], ["M154 27 C154.5 72 155.5 118 156 160", 156, 160]].map(([d, x, y], k) => (
        <g key={k}>
          <path d={d} fill="none" stroke="#3d3a35" strokeOpacity=".28" strokeWidth="4.4" strokeLinecap="round" transform="translate(1.6 1.2)" filter={url("b1")} />
          <path d={d} fill="none" stroke="#e9e5da" strokeWidth="2.8" strokeLinecap="round" />
          <path d={d} fill="none" stroke="#fff" strokeOpacity=".75" strokeWidth="1" strokeLinecap="round" transform="translate(-.5 0)" />
          <rect x={x - 2.5} y={y - 2} width="5" height="12" rx="2.5" fill={url("agl")} />
        </g>
      ))}
    </svg>
  );
}

// the Try-On studio (3D avatar + your own photo) loads only when someone opens it
const TryOn = lazy(() => import("./TryOn.jsx"));

// ─────────────────────────────────────────────────────────────
//  HOODIE RACK — section shown on the shop home page.
//  Real product photos hang side-on from a wire across a soft studio backdrop.
//  Hover (or tap) one and it turns on its hanger to face you. Click it (or tap again) and it lifts
//  off the rail into the foreground with price, colours, sizes,
//  TRY IT ON and ADD TO CART. Esc / Back / clicking the dark area puts it back.
//
//  Images live in public/hoodies/ (cut-*.webp = background removed). Shop
//  hoodies use their own product photo (multiplied onto the backdrop).
//  EDIT HERE: names, notes, colours and PRICES (in ৳).
//  While price is 0 the card shows "Price coming soon" and the
//  ADD TO CART button stays disabled.
// ─────────────────────────────────────────────────────────────
const HOUSE_ITEMS = [
  { id: 101, name: "Bow Print Hoodie", price: 990, old: 1290, tone: "#DC9EAB", asp: 563 / 700, note: "Pink fleece hoodie with a black bow graphic.", cut: "hoodies/cut-bow.webp",
    colors: [{ name: "Pink", hex: "#F4B8C8", img: "hoodies/cut-bow.webp" }] },
  { id: 102, name: "Meow Cat Hoodie", price: 990, old: 1290, tone: "#E2A9B6", asp: 591 / 700, note: "Pink fleece hoodie with a peeking cat print.", cut: "hoodies/cut-meow.webp",
    colors: [{ name: "Pink", hex: "#F2B7C9", img: "hoodies/cut-meow.webp" }] },
  { id: 103, name: "I'm OK Hoodie", price: 1090, old: 1390, tone: "#A3A69F", asp: 233 / 252, note: "Cartoon print hoodie, soft fleece inside.", cut: "hoodies/cut-okay-grey.webp",
    colors: [{ name: "Grey", hex: "#C3C6C4", img: "hoodies/cut-okay-grey.webp" }, { name: "Pink", hex: "#F0B8B0", img: "hoodies/okay-pink.png", photo: true }] },
  { id: 105, name: "Tribal Mark Hoodie", price: 1090, old: 1390, tone: "#1C1C1E", asp: 216 / 223, note: "Black hoodie with a white tribal-style graphic.", cut: "hoodies/cut-tribal.webp",
    colors: [{ name: "Black", hex: "#1C1C1C", img: "hoodies/cut-tribal.webp" }] },
  { id: 106, name: "Beware of Chicken Hoodie", price: 1090, old: 1390, tone: "#1C1C1E", asp: 213 / 219, note: "Black hoodie with a bold lettered print.", cut: "hoodies/cut-chicken.webp",
    colors: [{ name: "Black", hex: "#1C1C1C", img: "hoodies/cut-chicken.webp" }] },
];

// The rail collection (photos cut out, in public/hoodies/rail/). Price 0 = "Price coming soon".
const R = (id, name, tone, file, colour, note) => ({ id, name, price: 0, old: 0, tone, note, cut: `hoodies/rail/${file}.webp`,
  colors: [{ name: colour, hex: tone, img: `hoodies/rail/${file}.webp` }] });
const RAIL_ITEMS = [
  R(201, "Moonlit Palm Hoodie", "#1D5A3A", "moon-palm", "Green", "Forest green hoodie with a golden moon and palm print."),
  R(202, "Death Note Hoodie", "#1A1A1C", "death-note", "Black", "Black hoodie with the Death Note title print."),
  R(203, "Let's Move Forward Hoodie", "#DCC3BC", "move-forward", "Blush", "Soft blush hoodie with a colourful \"Let's Move Forward\" badge."),
  R(204, "Musafir Hoodie", "#8E1C22", "musafir", "Red", "Deep red hoodie with a \"Musafir — a little passenger\" print."),
  R(205, "Smile Is Sunnah Hoodie", "#1E2450", "sunnah", "Navy", "Navy hoodie with a gold and white \"Smile is Sunnah\" print."),
  R(206, "Butterfly Bloom Hoodie", "#E3A6BE", "butterfly", "Pink", "Pink hoodie with a half-flower butterfly print."),
  R(207, "Kitty Heart Hoodie", "#F0E4C2", "kitty", "Cream", "Cream hoodie with a kitty and heart print."),
  R(208, "Paris Stripe Hoodie", "#ECEDF0", "paris", "White", "White hoodie with a navy and red Paris stripe print."),
  R(209, "Meow Hoodie · Mustard", "#EDB12F", "meow-mustard", "Mustard", "Women's premium mustard hoodie with a meow cat face."),
  R(210, "Meow Hoodie · Lavender", "#BDB9E6", "meow-lavender", "Lavender", "Women's premium lavender hoodie with a meow cat face."),
  R(211, "Premium Plain Hoodie · Navy", "#1F2650", "plain-navy", "Navy", "Premium edition plain navy hoodie."),
  R(212, "Premium Plain Hoodie · Grey", "#BDBDBD", "plain-grey", "Grey melange", "Premium edition plain grey melange hoodie."),
  R(213, "Premium Plain Hoodie · Maroon", "#6A2230", "plain-maroon", "Maroon", "Premium edition plain maroon hoodie."),
];

// hoodies from the shop (supplier range) hung on the rail after our own ones
const RAIL_MAX = 40;
const SAG = 0; // the steel rod is straight (no dip)
// never hang the same hoodie twice: skip shop copies of our own designs, and shop
// listings that repeat a picture or the same name (ignoring filler words)
const HOUSE_RE = /\bbow\b|meow|i'?m\s*ok|tribal|chicken/i;
const FILLER = new Set("hoodie hoodies hoody hoodi sweatshirt sweatshirts premium stylish exclusive new unisex men mens women womens ladies boys girls for and with winter fleece cotton the a s quality best".split(" "));
const normName = n => String(n || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").split(" ")
  .filter(w => w && !FILLER.has(w)).sort().join(" ");
const uniqueHoodies = list => {
  const imgs = new Set(), names = new Set();
  return list.filter(p => {
    if (!p || !p.img || HOUSE_RE.test(p.name || "")) return false;
    const im = String(p.img).split("?")[0], nm = normName(p.name);
    if (imgs.has(im) || (nm && names.has(nm))) return false;
    imgs.add(im); if (nm) names.add(nm);
    return true;
  });
};
// fabric colour for a shop hoodie, guessed from its name / colour options
const TONES = [[/off.?white|cream|ivory/i, "#E6E0D2"], [/white/i, "#E9E8E4"], [/black/i, "#1E1E20"], [/navy/i, "#1F2A44"],
  [/sky/i, "#8FB3D6"], [/blue/i, "#2F5D9A"], [/maroon|wine|burgundy/i, "#5E1B25"], [/red/i, "#A3262A"], [/pink|rose/i, "#E2A3B4"],
  [/olive|army/i, "#55592F"], [/mint/i, "#9FD3BD"], [/green/i, "#2F5A3C"], [/brown|coffee|chocolate/i, "#5A3D2B"],
  [/beige|khaki|camel|sand/i, "#C7B08B"], [/yellow|mustard/i, "#D4A32E"], [/purple|lavender|violet/i, "#7D5BA6"],
  [/orange/i, "#D9682B"], [/teal/i, "#2D7A78"], [/gr[ae]y|ash|silver|melange/i, "#9C9E9F"]];
const toneFor = text => (TONES.find(([re]) => re.test(text)) || [0, "#3A3A3D"])[1];
const toItem = p => ({
  id: p.id, name: p.name, price: p.price || 0, old: p.old || 0, remote: true,
  tone: toneFor(`${p.name} ${(Array.isArray(p.colors) ? p.colors : []).join(" ")}`),
  note: "From our hoodie range. Pick a size and add to cart.",
  cut: p.img,
  colors: [{ name: (Array.isArray(p.colors) && p.colors[0]) || "Standard", hex: "#8A8070", img: p.img, photo: true }],
});

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const fmtBDT = n => "৳" + Number(n).toLocaleString();
const REDUCED = () => typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const TF = (x, y, s, r) => `perspective(1400px) translate3d(${x}px,${y}px,0px) scale(${s}) rotateY(${r}deg)`;
const SHADOW_REST = "drop-shadow(0px 10px 10px rgba(0,0,0,0.18))";
const SHADOW_HERO = "drop-shadow(0px 30px 30px rgba(0,0,0,0.22))";

// little hanger-with-sparkle icon for the Try-On buttons
function TryIcon() {
  return (
    <svg className="rk-ticon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 6.2a1.9 1.9 0 1 1 1.9-1.9M12 6.2v1.6L3.4 13.6c-.9.6-.5 2 .6 2h16c1.1 0 1.5-1.4.6-2L12 7.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.5 2.5l.5 1.4 1.4.5-1.4.5-.5 1.4-.5-1.4-1.4-.5 1.4-.5z" fill="currentColor" />
    </svg>
  );
}

// colours follow the existing site theme: dark #1C1C1C, red #C8392B, gold #E8A020, bg #F5F3EF
const CSS = `
.rk{position:relative;overflow:hidden;overflow:clip;background:linear-gradient(180deg,#ECE6F2 0%,#F3F0F2 48%,#E4EFE0 100%);color:#1C1C1C;border-bottom:1px solid #E8E4DE;font-family:inherit;
  --bw:245px;--bh:340px;--rest:168px;--face:252px;--hookh:40px}
.rk *{box-sizing:border-box}
.rk button{font-family:inherit;cursor:pointer}
.rk button:focus-visible{outline:2px solid #1C1C1C;outline-offset:3px}
.rk:before{content:"";position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(rgba(28,28,28,.045) 1px,transparent 1px);background-size:18px 18px}

.rk-band{position:relative;background:#1C1C1C;color:#fff;overflow:hidden;white-space:nowrap;padding:9px 0;font-size:12px;font-weight:800;letter-spacing:.22em;text-transform:uppercase}
.rk-band-track{display:inline-flex;animation:rkMarquee 26s linear infinite}
.rk-band-track span{padding:0 22px}
.rk-band-track b{color:#E8A020}
@keyframes rkMarquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}

.rk-in{position:relative;max-width:1200px;margin:0 auto;padding:34px 18px 30px;min-height:620px}
.rk-head{text-align:center}
.rk-kicker{font-size:11px;font-weight:700;letter-spacing:.24em;text-transform:uppercase;color:#8A8070}
.rk-title{margin:8px 0 0;font-size:40px;font-weight:900;letter-spacing:-.02em;line-height:1;display:inline-flex;align-items:center;gap:12px}
.rk-badge{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;background:#C8392B;color:#fff;padding:5px 11px;border-radius:999px}
.rk-hint{font-size:14px;color:#8A8070;margin:10px 0 0}

/* the rack spans the full width of the page, edge to edge */
.rk-rack{position:relative;width:100vw;left:50%;margin:40px 0 0 -50vw;padding-top:0}
/* a thin wire strung edge to edge, dipping slightly under the weight of the hangers */
/* a polished steel rod held by two wall brackets */
.rk-rod{position:absolute;left:0;right:0;top:-2px;height:10px;border-radius:5px;pointer-events:none;z-index:1;
  background:linear-gradient(180deg,#fbfbf8 0%,#d6d6d1 30%,#a9a9a4 60%,#6c6c68 100%);
  box-shadow:0 10px 16px -6px rgba(28,28,28,.3),0 2px 3px rgba(0,0,0,.14);animation:rkDraw .9s ease .1s both}
.rk-rod i{position:absolute;top:-34px;width:16px;height:46px;border-radius:5px 5px 7px 7px;
  background:linear-gradient(90deg,#6f6f6a,#ecece7 42%,#b4b4af 60%,#7a7a75);box-shadow:0 6px 10px rgba(28,28,28,.22)}
.rk-rod i:before{content:"";position:absolute;left:50%;top:-6px;width:30px;height:8px;margin-left:-15px;border-radius:3px;background:linear-gradient(180deg,#e9e9e4,#8d8d88)}
.rk-rod i:first-child{left:3%}.rk-rod i:last-child{right:3%}
@keyframes rkDraw{from{opacity:0}to{opacity:1}}
/* little white price tag tied to each hanger's neck */
/* a little kraft-paper price tag tied to the hanger's neck */
.rk-tag{position:absolute;top:34px;left:calc(50% + 15px);z-index:4;pointer-events:none;background:linear-gradient(160deg,#F1E4CB,#E2CFAC);color:#3B2F22;
  font-size:10px;font-weight:800;letter-spacing:.02em;padding:3px 7px 3px 12px;border-radius:2px 4px 4px 2px;white-space:nowrap;
  clip-path:polygon(6px 0,100% 0,100% 100%,6px 100%,0 50%);box-shadow:0 2px 5px rgba(60,40,20,.2);transform:rotate(10deg);transform-origin:0 50%;transition:opacity .2s}
.rk-tag:before{content:"";position:absolute;left:5px;top:50%;width:3px;height:3px;margin-top:-1.5px;border-radius:50%;background:#9C8763}
.rk-tagstr{position:absolute;top:30px;left:calc(50% + 4px);width:13px;height:9px;z-index:3;pointer-events:none;border-top:1px solid #8E7B5A;border-right:1px solid #8E7B5A;border-radius:0 8px 0 0;transform:rotate(18deg);transform-origin:0 0;transition:opacity .2s}
.rk-row{position:relative;display:flex;justify-content:flex-start;align-items:flex-start;gap:0;height:calc(var(--bh) + var(--hookh) + 44px);touch-action:pan-y;user-select:none;cursor:grab}
.rk-row:active{cursor:grabbing}
.rk-pend{position:relative;width:100%;height:100%;transform-origin:50% 0;will-change:transform}

.rk-slot{position:relative;flex:none;width:var(--rest);height:100%;border:0;background:transparent;padding:0;z-index:2;transition:width .75s cubic-bezier(.2,.8,.2,1);animation:rkIn .8s cubic-bezier(.2,.9,.3,1.2) both;animation-delay:calc(var(--i) * 90ms + 250ms)}
.rk-slot[data-face="true"]{width:var(--face);z-index:4}
@keyframes rkIn{0%{opacity:0;transform:translateY(-70px) rotate(-7deg)}60%{opacity:1}100%{opacity:1;transform:translateY(0) rotate(0)}}
.rk-sway{position:absolute;left:50%;top:-6px;width:var(--bw);margin-left:calc(var(--bw) / -2);transform-origin:50% 2px;animation:rkSway 5.5s ease-in-out infinite;animation-delay:calc(var(--i) * -1.3s)}
@keyframes rkSway{0%,100%{transform:rotate(-.9deg)}50%{transform:rotate(.9deg)}}
/* a small chrome hook rides on the wire and disappears behind the hood */
/* chrome hook over the rod, into a small wooden hanger neck that tucks under the hood */
.rk-hook{position:absolute;left:50%;top:-2px;width:30px;height:52px;margin-left:-15px;overflow:visible;pointer-events:none;filter:drop-shadow(0 2px 2px rgba(0,0,0,.2))}
/* the real product photo, hung side-on. It has a little body to it: a few darker
   copies stacked behind give the garment soft depth along its near edge, and a
   gentle light falls across the fabric (darker on the side turned away) */
.rk-box{position:relative;width:var(--bw);height:var(--bh);margin-top:var(--hookh);pointer-events:none;perspective:1600px}
.rk-turnwrap{position:absolute;inset:0;transition:opacity .15s}
.rk-sidewrap{position:absolute;inset:0;transform-origin:50% 0;will-change:transform;backface-visibility:hidden;filter:brightness(var(--shade,1)) drop-shadow(0 14px 12px rgba(28,28,28,.2))}
.rk-side{position:absolute;top:0;left:50%;height:100%;width:auto;aspect-ratio:190/490;transform:translateX(-50%);overflow:visible}
.rk-photo{position:absolute;left:0;top:0;width:100%;height:100%;object-fit:contain;object-position:50% 0;pointer-events:none;transform-origin:50% 0;backface-visibility:hidden}
.rk-photo{filter:brightness(var(--shade,1)) drop-shadow(0 14px 12px rgba(28,28,28,.18))}
.rk-slot[data-face="true"] .rk-photo{filter:brightness(var(--shade,1)) drop-shadow(0 20px 18px rgba(28,28,28,.24))}
.rk-h-touch{display:none}

.rk-info{min-height:76px;margin-top:6px;display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;transition:opacity .3s}
.rk-line{font-size:14px;font-weight:600;color:#1C1C1C;animation:rkFade .35s ease both}
.rk-line span{color:#C8392B;font-weight:800}
.rk-thumb{width:34px;height:34px;border-radius:8px;object-fit:cover;vertical-align:middle;margin-right:8px;box-shadow:0 2px 8px rgba(0,0,0,.15);background:#fff}
.rk-line.muted{color:#8A8070;font-weight:500}
@keyframes rkFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.rk-avail{border:1.5px solid #1C1C1C;background:transparent;color:#1C1C1C;border-radius:999px;padding:8px 18px;font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;transition:background .2s,color .2s,transform .15s}
.rk-avail:hover{background:#1C1C1C;color:#fff;transform:translateY(-2px)}
.rk-avail:disabled{opacity:.35;cursor:default;transform:none;background:transparent;color:#1C1C1C}
.rk[data-on="true"] .rk-info{opacity:0}
.rk-acts{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
.rk-ticon{width:16px;height:16px;flex:none}
.rk-try{display:inline-flex;align-items:center;gap:7px;background:#1C1C1C;color:#fff}
.rk-try:hover{background:#C8392B;border-color:#C8392B}
.rk-trybtn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;height:44px;border-radius:12px;border:1.5px solid #1C1C1C;background:#fff;color:#1C1C1C;font-size:12px;font-weight:800;letter-spacing:.06em;transition:background .2s,color .2s,transform .15s}
.rk-trybtn:hover{background:#1C1C1C;color:#fff;transform:translateY(-1px)}
.rk-trybtn .rk-ticon{width:18px;height:18px}
.rk-tryload{position:fixed;inset:0;z-index:900;display:flex;align-items:center;justify-content:center;gap:12px;background:rgba(245,243,239,.92);font-size:14px;font-weight:700;color:#1C1C1C}
.rk-tryload span{width:22px;height:22px;border-radius:50%;border:3px solid #E8E4DE;border-top-color:#C8392B;animation:rkSpin .8s linear infinite}
@keyframes rkSpin{to{transform:rotate(360deg)}}

/* dim room + spotlight */
.rk-dim{position:absolute;inset:0;z-index:10;pointer-events:none;opacity:0;transition:opacity .6s ease;background:radial-gradient(closest-side at var(--cx,40%) var(--cy,50%),rgba(255,255,255,.9),rgba(250,249,247,0) 80%),rgba(248,247,245,.96)}
.rk[data-on="true"] .rk-dim{opacity:1}
.rk[data-on="true"]{cursor:zoom-out}
.rk[data-on="true"] .rk-slot,.rk[data-on="true"] .rk-card{cursor:default}
.rk[data-on="true"] .rk-slot{cursor:pointer}

/* the garment that comes off the rail */
.rk-fly{position:absolute;z-index:20;display:none;will-change:transform,filter;transform:${TF(0, 0, 1, 0)}}
.rk-fly:before{content:"";position:absolute;left:50%;bottom:calc(100% - 6px);width:1px;height:1200px;background:linear-gradient(rgba(60,60,60,0),#555 30%);opacity:0;transition:opacity .25s}
.rk[data-on="true"] .rk-fly:before{opacity:1;transition:opacity .6s ease .55s}
.rk-fly img{display:block;width:100%;height:100%;object-fit:contain;object-position:50% 0;transition:opacity .45s ease}
.rk-fly img.photo{object-fit:cover;object-position:50% 20%;border-radius:12px}
.rk-sweep{position:absolute;inset:0;pointer-events:none;background:linear-gradient(110deg,rgba(255,244,225,0) 40%,rgba(255,244,225,.45) 50%,rgba(255,244,225,0) 60%);background-size:300% 100%;background-position:150% 0;opacity:0;mix-blend-mode:soft-light;-webkit-mask:var(--m) center top/contain no-repeat;mask:var(--m) center top/contain no-repeat}
.rk-fly[data-sweep="1"] .rk-sweep{animation:rkSweep 1.3s ease .6s both}
@keyframes rkSweep{0%{background-position:150% 0;opacity:1}100%{background-position:-50% 0;opacity:1}}

/* product card */
.rk-card{position:absolute;z-index:30;top:90px;right:max(18px,calc((100% - 1200px) / 2 + 30px));width:320px;background:transparent;border:0;border-radius:16px;padding:22px;box-shadow:none;
  opacity:0;visibility:hidden;transform:translateX(34px);transition:opacity .45s ease .2s,transform .55s cubic-bezier(.2,.9,.3,1.1) .2s,visibility 0s linear .65s}
.rk[data-on="true"] .rk-card{opacity:1;visibility:visible;transform:translateX(0);transition:opacity .45s ease .25s,transform .55s cubic-bezier(.2,.9,.3,1.1) .25s,visibility 0s}
.rk-reveal{display:flex;flex-direction:column;gap:12px}
.rk-reveal>*{animation:rkUp .5s cubic-bezier(.2,.9,.3,1.1) both}
.rk-reveal>*:nth-child(1){animation-delay:.30s}.rk-reveal>*:nth-child(2){animation-delay:.37s}.rk-reveal>*:nth-child(3){animation-delay:.44s}
.rk-reveal>*:nth-child(4){animation-delay:.51s}.rk-reveal>*:nth-child(5){animation-delay:.58s}.rk-reveal>*:nth-child(6){animation-delay:.65s}
.rk-reveal>*:nth-child(7){animation-delay:.72s}
@keyframes rkUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
.rk-back{align-self:flex-start;display:inline-flex;align-items:center;gap:8px;background:#F5F3EF;border:1px solid #E8E4DE;border-radius:999px;padding:8px 14px;font-size:12px;font-weight:700;color:#1C1C1C;transition:transform .15s,background .2s,color .2s}
.rk-back:hover{background:#1C1C1C;color:#fff;transform:translateX(-2px)}
.rk-eyebrow{font-size:11px;letter-spacing:.2em;color:#8A8070;font-weight:700;font-variant-numeric:tabular-nums}
.rk-name{font-weight:800;font-size:26px;line-height:1.1;margin-top:6px;letter-spacing:-.01em}
.rk-price{font-size:20px;font-weight:800;color:#C8392B}
.rk-note{font-size:13px;color:#8A8070;line-height:1.5}
.rk-lbl{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px}
.rk-sws{display:flex;gap:10px;flex-wrap:wrap}
.rk-sw{display:inline-flex;align-items:center;gap:8px;padding:6px 12px 6px 6px;border-radius:999px;border:2px solid #E8E4DE;background:#fff;font-size:12px;font-weight:700;color:#1C1C1C;transition:border-color .2s,transform .15s}
.rk-sw i{width:22px;height:22px;border-radius:50%;border:1px solid rgba(0,0,0,.25);display:block}
.rk-sw[aria-pressed="true"]{border-color:#1C1C1C}
.rk-sw:active{transform:scale(.95)}
.rk-sizes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.rk-size{height:44px;border-radius:999px;font-size:13px;font-weight:700;background:#fff;color:#1C1C1C;border:2px solid #E8E4DE;transition:transform .15s,background .2s,color .2s,border-color .2s}
.rk-size:hover{transform:translateY(-2px);border-color:#1C1C1C}
.rk-size:active{transform:scale(.94)}
.rk-size[aria-pressed="true"]{background:#1C1C1C;color:#fff;border-color:#1C1C1C}
.rk-addwrap{position:relative}
.rk-add{width:100%;height:50px;border:0;border-radius:12px;font-size:13px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;background:#C8392B;color:#fff;transition:transform .15s,background .25s}
.rk-add:not(:disabled):hover{transform:translateY(-2px)}
.rk-add:not(:disabled):active{transform:scale(.96)}
.rk-add:disabled{background:#E8E4DE;color:#6b6358;cursor:not-allowed}
.rk-add.done{background:#2E7D52}
.rk-fx{position:absolute;left:50%;top:50%;width:8px;height:8px;border-radius:50%;pointer-events:none;animation:rkBurst .8s ease-out forwards}
@keyframes rkBurst{from{opacity:1;transform:translate(-50%,-50%) rotate(var(--a)) translateX(0)}to{opacity:0;transform:translate(-50%,-50%) rotate(var(--a)) translateX(70px)}}

@media (max-width:700px){
  .rk{--bw:196px;--bh:270px;--rest:34px;--face:186px}
  .rk-in{padding:26px 12px 20px;min-height:760px}
  .rk-title{font-size:30px}
  .rk-rack{margin-top:30px}
  .rk-card{top:auto;bottom:12px;left:12px;right:12px;width:auto;padding:18px;transform:translateY(34px);background:#fff;box-shadow:0 14px 40px rgba(0,0,0,.16)}
  .rk[data-on="true"] .rk-card{transform:translateY(0)}
  .rk-sizes{grid-template-columns:repeat(6,minmax(0,1fr))}
  .rk-size{height:40px}
  /* phones: hoodies hang side by side on a swipeable rail (no overlapping) */
  .rk{--bw:196px;--bh:270px;--rest:124px;--face:178px;--hookh:40px}
  .rk-row{padding-top:6px;height:calc(var(--bh) + var(--hookh) + 60px)}
  .rk-rod{top:4px}
  .rk-tag{font-size:9px;padding:2px 6px 2px 11px}
  .rk-h-web{display:none}
  .rk-h-touch{display:inline}
}
@media (prefers-reduced-motion:reduce){
  .rk *,.rk *:before{animation:none!important;transition:none!important}
}
`;

const BURST = ["#C8392B", "#E8A020", "#2E7D52", "#1F3A8A", "#DB2777", "#1C1C1C", "#E8A020", "#C8392B"];

export default function HoodieRail({ onAdd, onBrowse, extra = [] }) {
  const ITEMS = [...HOUSE_ITEMS, ...RAIL_ITEMS, ...uniqueHoodies(extra).map(toItem)].slice(0, RAIL_MAX);
  const [facing, setFacing] = useState(null);   // garment turned towards the viewer
  const [active, setActive] = useState(null);   // garment pulled off the rail
  const [lifted, setLifted] = useState(() => ITEMS.map(() => false));
  const [variant, setVariant] = useState(() => ITEMS.map(() => 0));
  const [size, setSize] = useState(null);
  const [added, setAdded] = useState(false);
  const [burst, setBurst] = useState(0);
  const [dimPos, setDimPos] = useState({ cx: "40%", cy: "50%" });
  const [tryOn, setTryOn] = useState(null); // index of the hoodie open in the Try-On studio

  const secRef = useRef(null);
  const slotRefs = useRef([]);
  const boxRefs = useRef([]);
  const flyRefs = useRef([]);
  const backRef = useRef(null);
  const geo = useRef(ITEMS.map(() => null));
  const anims = useRef(ITEMS.map(() => null));
  const activeRef = useRef(null);
  const interacted = useRef(false);
  const zTop = useRef(20);

  // ── The rail has weight. Grab it and slide the hoodies along the rod: each hook
  // swings against the direction you pull, lags, overshoots a little and settles.
  // Let go mid-motion and the rail keeps gliding, slowing to a stop on the rod.
  const railX = useRef(0);   // how far the rail has been pushed (px)
  const railT = useRef(0);   // where the rail is coming to rest (px)
  const railV = useRef(0);   // rail speed (px/s)
  const hang = useRef(ITEMS.map(() => ({ a: 0, v: 0 }))); // hook swing per hoodie (deg, deg/s)
  const dragS = useRef({ on: false, moved: false, sx: 0, lx: 0, lt: 0, vx: 0, base: 0 });
  const rowRef = useRef(null);
  const pendRefs = useRef([]);
  const loopId = useRef(0);
  const lastTs = useRef(0);
  const wireRef = useRef(null);
  const keepUntil = useRef(0); // keep animating while hangers make room for a turning hoodie
  // ── each hoodie turns on its hanger: angle springs towards its target (0° = facing you)
  const restFor = () => SPIN_REST;
  const turn = useRef(ITEMS.map(() => ({ a: SPIN_REST, v: 0, t: SPIN_REST })));
  const sideRefs = useRef([]);   // the side-on drawing of each hoodie
  const frontRefs = useRef([]);  // its real front photo

  // total width of the hoodies on the rail (they overflow both sides of the row on phones)
  const contentW = () => {
    const row = rowRef.current; if (!row) return 0;
    const kids = Array.from(row.children);
    const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    return kids.reduce((w, k) => w + k.offsetWidth, 0) + gap * Math.max(0, kids.length - 1);
  };
  // how far the rail can slide: [left limit, right limit]. Phones line the hangers
  // up from the left edge; wider screens keep them centred under the title.
  const padRef = useRef(24);
  const bounds = () => {
    const row = rowRef.current;
    if (!row) return [0, 0];
    const W = row.clientWidth, edge = W < 700 ? 16 : 40;
    return [-Math.max(0, padRef.current + contentW() + edge - W), 0];
  };
  // start the hangers from the left edge; centre them if they all fit on screen
  const fitRail = () => {
    const row = rowRef.current, sec = secRef.current;
    if (!row || !sec) return;
    const cs = getComputedStyle(sec);
    const rest = parseFloat(cs.getPropertyValue("--rest")) || 100, faceW = parseFloat(cs.getPropertyValue("--face")) || 200;
    const n = row.children.length, W = row.clientWidth;
    const total = n * rest + (faceW - rest);
    const pad = Math.max(W < 700 ? 6 : 24, (W - total) / 2);
    padRef.current = pad;
    row.style.paddingLeft = pad + "px";
  };
  // bring a hoodie fully into view (keyboard focus, or tapping one at the edge)
  const reveal = i => {
    const sl = slotRefs.current[i], sec = secRef.current;
    if (!sl || !sec) return;
    const r = sl.getBoundingClientRect(), S = sec.getBoundingClientRect();
    let dx = 0;
    if (r.left < S.left + 12) dx = S.left + 12 - r.left;
    else if (r.right > S.right - 12) dx = S.right - 12 - r.right;
    if (!dx) return;
    const [lo, hi] = bounds();
    railT.current = Math.max(lo, Math.min(hi, railX.current + dx));
    kick();
  };
  const paint = () => {
    if (rowRef.current) rowRef.current.style.transform = `translate3d(${railX.current}px,0,0)`;
    const w = wireRef.current ? wireRef.current.getBoundingClientRect() : null;
    pendRefs.current.forEach((el, i) => {
      if (!el) return;
      let y = 0; // each hook sits on the curve of the wire wherever it is along it
      const sl = slotRefs.current[i];
      if (w && w.width && sl) {
        const r = sl.getBoundingClientRect();
        const t = Math.min(1, Math.max(0, (r.left + r.width / 2 - w.left) / w.width));
        y = 4 * SAG * t * (1 - t);
      }
      const a = hang.current[i] ? hang.current[i].a : 0;
      el.style.transform = `translateY(${y.toFixed(2)}px) rotate(${a.toFixed(3)}deg)`;
    });
  };
  function tick(now) {
    const dt = Math.min(0.033, Math.max(0.001, (now - lastTs.current) / 1000));
    lastTs.current = now;
    const d = dragS.current;
    if (!d.on) { // spring the rail towards its resting point
      const acc = -170 * (railX.current - railT.current) - 24 * railV.current;
      railV.current += acc * dt;
      railX.current += railV.current * dt;
    }
    // hooks lag behind the rail's speed (a pendulum), so the hoodies swing as it moves
    const lag = REDUCED() ? 0 : Math.max(-16, Math.min(16, -railV.current * 0.02));
    let busy = d.on || now < keepUntil.current || Math.abs(railV.current) > 0.05 || Math.abs(railX.current - railT.current) > 0.05;
    hang.current.forEach(h => {
      h.v += (-90 * (h.a - lag) - 7 * h.v) * dt;
      h.a += h.v * dt;
      if (Math.abs(h.a) > 0.05 || Math.abs(h.v) > 0.05) busy = true;
    });
    // hoodies twist a little on their hooks while the rail moves, and turn to face you on a
    // soft spring (slight overshoot, like fabric settling)
    const twist = REDUCED() ? 0 : Math.max(-9, Math.min(9, railV.current * 0.012));
    turn.current.forEach((g, i) => {
      const target = g.t === 0 ? 0 : g.t + twist;
      if (REDUCED()) { g.a = target; g.v = 0; }
      else {
        g.v += (-80 * (g.a - target) - 16 * g.v) * dt;
        g.a += g.v * dt;
      }
      if (Math.abs(g.a - target) > 0.08 || Math.abs(g.v) > 0.08) busy = true;
      // it hangs side-on and flips round its hook to show the real photo: the side view closes
      // up to a sliver, then the front opens out the other way
      const sd = sideRefs.current[i], fr = frontRefs.current[i];
      if (sd && fr) {
        const p = Math.max(-0.1, Math.min(1.04, 1 - g.a / SPIN_REST));
        const th = p * 180;
        if (th <= 90) {
          sd.style.visibility = "visible"; fr.style.visibility = "hidden";
          sd.style.transform = `perspective(1400px) rotateY(${th.toFixed(2)}deg)`;
        } else {
          sd.style.visibility = "hidden"; fr.style.visibility = "visible";
          fr.style.transform = `perspective(1400px) rotateY(${(th - 180).toFixed(2)}deg)`;
        }
        const sh = 1 - 0.14 * Math.min(1, Math.abs(th <= 90 ? th : 180 - th) / 90);
        (th <= 90 ? sd : fr).style.setProperty("--shade", sh.toFixed(3));
      }
    });
    paint();
    loopId.current = busy ? requestAnimationFrame(tick) : 0;
  }
  const kick = () => {
    if (loopId.current) return;
    lastTs.current = performance.now();
    loopId.current = requestAnimationFrame(tick);
  };
  // hangers slide apart when a hoodie turns to face you: follow the wire while they move
  useEffect(() => {
    turn.current.forEach((g, i) => { g.t = facing === i ? 0 : restFor(i); });
    keepUntil.current = performance.now() + 1100;
    kick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing]);
  useEffect(() => {
    fitRail(); paint();
    keepUntil.current = performance.now() + 300; kick();
    const onResize = () => { fitRail(); paint(); keepUntil.current = performance.now() + 300; kick(); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const onRowWheel = e => {
    if (active !== null || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    const [lo, hi] = bounds();
    railT.current = Math.max(lo, Math.min(hi, railT.current - e.deltaX));
    kick();
  };
  const onRowDown = e => {
    if (active !== null || e.button !== 0) return;
    const d = dragS.current;
    d.on = true; d.moved = false; d.sx = d.lx = e.clientX; d.lt = performance.now(); d.vx = 0; d.base = railX.current;
    railV.current = 0;
    const move = ev => {
      const now = performance.now();
      const dt = now - d.lt;
      if (dt > 0) d.vx = d.vx * 0.6 + ((ev.clientX - d.lx) / dt * 1000) * 0.4;
      d.lx = ev.clientX; d.lt = now;
      const dx = ev.clientX - d.sx;
      if (!d.moved && Math.abs(dx) > 6) d.moved = true;
      if (!d.moved) return;
      const raw = d.base + dx, [lo, hi] = bounds();
      railX.current = raw > hi ? hi + (raw - hi) * 0.35 : raw < lo ? lo + (raw - lo) * 0.35 : raw; // rubber-band at the ends
      railV.current = d.vx;
      paint(); kick();
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      d.on = false;
      if (performance.now() - d.lt > 90) d.vx = 0; // paused before letting go: no fling
      if (d.moved) {
        const [lo, hi] = bounds();
        railV.current = d.vx;
        railT.current = Math.max(lo, Math.min(hi, railX.current + d.vx * 0.25));
      }
      kick();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    kick();
  };

  // showcase: garments take turns facing the viewer until someone interacts
  useEffect(() => {
    if (REDUCED()) return;
    const t = setInterval(() => {
      if (interacted.current || activeRef.current !== null) return;
      const S = secRef.current ? secRef.current.getBoundingClientRect() : null;
      setFacing(f => {
        for (let k = 1; k <= ITEMS.length; k++) {
          const j = ((f === null ? -1 : f) + k) % ITEMS.length;
          const r = slotRefs.current[j] ? slotRefs.current[j].getBoundingClientRect() : null;
          if (!S || !r || (r.left > S.left + 8 && r.right < S.right - 8)) return j;
        }
        return f;
      });
    }, 2600);
    return () => clearInterval(t);
  }, []);
  const touch = () => { interacted.current = true; };

  // where the garment hangs (flat, facing) and where it should be presented
  const measure = i => {
    const sec = secRef.current, box = boxRefs.current[i];
    if (!sec || !box) return null;
    const S = sec.getBoundingClientRect(), r = box.getBoundingClientRect();
    const w = box.offsetWidth, h = box.offsetHeight;
    const sx = r.left + r.width / 2 - w / 2 - S.left, sy = r.top - S.top;
    const mobile = S.width < 700;
    const H = mobile ? Math.min(250, S.height * 0.34) : Math.max(260, Math.min(430, S.height - 210));
    const cx = mobile ? S.width / 2 : Math.max(H * 0.45, (S.width - 360) / 2);
    const cy = mobile ? 52 + H / 2 : S.height - 34 - H / 2;
    const s = H / h;
    return { sx, sy, w, h, s, cx, cy, dx: cx - (sx + w / 2), dy: cy - H / 2 - sy };
  };

  const stopAnim = i => {
    const a = anims.current[i];
    if (a) { try { a.commitStyles(); } catch (e) { /* ignore */ } a.cancel(); anims.current[i] = null; }
  };

  const openTryOn = i => { touch(); setTryOn(Math.max(0, Math.min(ITEMS.length - 1, i || 0))); };

  const openFlyer = i => {
    const fly = flyRefs.current[i];
    const g = measure(i);
    if (!fly || !g) return;
    const quick = REDUCED();
    const wasOut = fly.style.display === "block";
    stopAnim(i);
    Object.assign(fly.style, { left: g.sx + "px", top: g.sy + "px", width: g.w + "px", height: g.h + "px", transformOrigin: "50% 0" });
    const start = TF(0, 0, 1, 0);
    if (!wasOut) {
      Object.assign(fly.style, { display: "block", transform: start, filter: SHADOW_REST });
      fly.dataset.sweep = "0"; void fly.offsetWidth; fly.dataset.sweep = "1";
    }
    geo.current[i] = g;
    fly.style.zIndex = String(++zTop.current);
    const dest = TF(g.dx, g.dy, g.s, -5);
    const kf = wasOut
      ? [{ transform: dest, filter: SHADOW_HERO }]
      : [
          { transform: start, filter: SHADOW_REST, offset: 0 },
          { transform: TF(0, -30, 1.05, 0), filter: "drop-shadow(0px 22px 20px rgba(0,0,0,0.32))", offset: 0.22 }, // lifted off the hook
          { transform: dest, filter: SHADOW_HERO, offset: 1 },
        ];
    const anim = fly.animate(kf, { duration: quick ? 1 : 1000, easing: "cubic-bezier(.22,.8,.2,1)", fill: "forwards" });
    anims.current[i] = anim;
    anim.onfinish = () => { fly.style.transform = dest; fly.style.filter = SHADOW_HERO; anim.cancel(); if (anims.current[i] === anim) anims.current[i] = null; };
    setDimPos({ cx: g.cx + "px", cy: g.cy + "px" });
  };

  const closeFlyer = i => {
    const fly = flyRefs.current[i];
    if (!fly || fly.style.display !== "block") { setLifted(l => l.map((v, k) => (k === i ? false : v))); return; }
    stopAnim(i);
    const g0 = geo.current[i], g1 = measure(i);
    if (g0 && g1) {
      Object.assign(fly.style, { left: g1.sx + "px", top: g1.sy + "px", transform: TF(g0.dx + g0.sx - g1.sx, g0.dy + g0.sy - g1.sy, g0.s, -5) });
    }
    const rest = TF(0, 0, 1, 0);
    const anim = fly.animate([{ transform: rest, filter: SHADOW_REST }], { duration: REDUCED() ? 1 : 760, easing: "cubic-bezier(.5,0,.2,1)", fill: "forwards" });
    anims.current[i] = anim;
    anim.onfinish = () => {
      anim.cancel(); if (anims.current[i] === anim) anims.current[i] = null;
      fly.style.display = "none"; fly.style.transform = rest; fly.style.filter = SHADOW_REST;
      setLifted(l => l.map((v, k) => (k === i ? false : v)));
    };
  };

  const select = i => {
    touch();
    if (active === i) return;
    if (active !== null) closeFlyer(active);
    setFacing(i);
    setLifted(l => l.map((v, k) => (k === i ? true : v)));
    openFlyer(i);
    activeRef.current = i;
    setActive(i); setSize(null); setAdded(false);
    const sec = secRef.current;
    if (sec) { const r = sec.getBoundingClientRect(); if (r.top < -40 || r.bottom > window.innerHeight + 40) sec.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
    setTimeout(() => backRef.current && backRef.current.focus({ preventScroll: true }), 450);
  };
  const close = () => {
    if (active === null) return;
    const i = active;
    closeFlyer(i);
    activeRef.current = null;
    setActive(null); setSize(null); setAdded(false);
    const s = slotRefs.current[i]; if (s) s.focus({ preventScroll: true });
  };

  // on touch screens the first tap turns the garment, the second takes it off the rail
  const slotClick = i => { if (dragS.current.moved) return; touch(); if (active === null && facing !== i && !window.matchMedia("(hover: hover)").matches) { setFacing(i); return; } select(i); };
  const slotKey = (e, i) => {
    if (active !== null) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const n = (i + (e.key === "ArrowRight" ? 1 : -1) + ITEMS.length) % ITEMS.length;
      slotRefs.current[n] && slotRefs.current[n].focus();
    }
  };

  // Esc closes, ← → switch while a garment is out
  useEffect(() => {
    if (active === null || tryOn !== null) return;   // the Try-On studio handles its own keys
    const onKey = e => {
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); select((active + 1) % ITEMS.length); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); select((active + ITEMS.length - 1) % ITEMS.length); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  // keep the presented garment in place when the window is resized
  useEffect(() => {
    const onResize = () => {
      const i = activeRef.current; if (i === null) return;
      const fly = flyRefs.current[i], g = measure(i); if (!fly || !g) return;
      stopAnim(i); geo.current[i] = g;
      Object.assign(fly.style, { left: g.sx + "px", top: g.sy + "px", width: g.w + "px", height: g.h + "px", transform: TF(g.dx, g.dy, g.s, -5), filter: SHADOW_HERO });
      setDimPos({ cx: g.cx + "px", cy: g.cy + "px" });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const sel = active !== null ? ITEMS[active] : null;
  const selVar = sel ? sel.colors[variant[active]] : null;
  const hasPrice = sel ? sel.price > 0 : false;
  const face = facing !== null ? ITEMS[facing] : null;

  const add = () => {
    if (!sel || !size || !hasPrice) return;
    onAdd({ id: `${sel.id}-${selVar.name}-${size}`, name: `${sel.name} · ${selVar.name} (${size})`, cat: "clothing", price: sel.price, old: 0, icon: "🧥", badge: null, img: selVar.img });
    setAdded(true); setBurst(b => b + 1);
  };

  const band = ["New arrivals", "Hoodies", "Graphic prints", "Limited drops", "Outback Cartel"];
  const bandItems = [...band, ...band, ...band, ...band].map((t, i) => <span key={i}>{t} <b>✦</b></span>);

  return (
    <section id="oc-drop" ref={secRef} className="rk" aria-label="Hoodies" data-on={active !== null}
      style={{ "--cx": dimPos.cx, "--cy": dimPos.cy, scrollMarginTop: 70 }}
      onClick={e => { if (active !== null && !e.target.closest(".rk-slot, .rk-card, .rk-fly")) close(); }}>
      <style>{CSS}</style>
      <div className="rk-band" aria-hidden="true"><div className="rk-band-track">{bandItems}{bandItems}</div></div>

      <div className="rk-in">
        <div className="rk-head">
          <div className="rk-kicker">Outback Cartel · The Rack</div>
          <h2 className="rk-title">Hoodies <span className="rk-badge">New</span></h2>
          <p className="rk-hint"><span className="rk-h-web">Hover a hoodie to turn it. Drag the rail for more, click to take one off.</span><span className="rk-h-touch">Swipe along the rail. Tap a hoodie to turn it, tap again to take it off.</span></p>
        </div>

        <div className="rk-rack" onMouseLeave={() => { if (active === null && interacted.current) setFacing(null); }}>
          <div className="rk-rod" ref={wireRef} aria-hidden="true"><i /><i /></div>
          <div className="rk-row" ref={rowRef} onPointerDown={onRowDown} onWheel={onRowWheel}>
            {ITEMS.map((it, i) => (
              <button key={it.id} ref={el => (slotRefs.current[i] = el)} className="rk-slot" style={{ "--i": i }}
                data-face={facing === i} aria-pressed={active === i} aria-label={`${it.name}${it.price ? ", " + fmtBDT(it.price) : ""}. Open details`}
                onMouseEnter={() => { touch(); if (active === null && !dragS.current.on) setFacing(i); }}
                onFocus={() => { if (active === null) { setFacing(i); setTimeout(() => reveal(i), 60); } }}
                onKeyDown={e => slotKey(e, i)}
                onClick={() => slotClick(i)}>
                <div className="rk-pend" ref={el => (pendRefs.current[i] = el)}>
                  <div className="rk-sway">
                    <span className="rk-tag" style={{ opacity: lifted[i] ? 0 : 1 }}>{it.price ? fmtBDT(it.price) : "Soon"}</span>
<span className="rk-tagstr" style={{ opacity: lifted[i] ? 0 : 1 }} />
                    <svg className="rk-hook" viewBox="0 0 30 52" aria-hidden="true">
                      <defs>
                        <linearGradient id={`hk${i}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#6f6f6a" /><stop offset=".45" stopColor="#f8f8f4" /><stop offset=".7" stopColor="#a3a39e" /><stop offset="1" stopColor="#5e5e5a" /></linearGradient>
                        <linearGradient id={`rd${i}`} x1="0" y1="6" x2="0" y2="16" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#fbfbf8" /><stop offset=".3" stopColor="#d6d6d1" /><stop offset=".6" stopColor="#a9a9a4" /><stop offset="1" stopColor="#6c6c68" /></linearGradient>
                        <linearGradient id={`wd${i}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#6B3F1C" /><stop offset=".3" stopColor="#B07A45" /><stop offset=".5" stopColor="#DDAC74" /><stop offset=".75" stopColor="#A06A38" /><stop offset="1" stopColor="#5E3618" /></linearGradient>
                      </defs>
                      <path d="M15 37 V27 C15 21 21.5 18 21.5 11 C21.5 4.5 18.5 1 14.5 1 C10 1 7.5 4.5 7.5 9" fill="none" stroke={`url(#hk${i})`} strokeWidth="2.6" strokeLinecap="round" />
                      <rect x="4" y="6" width="7.2" height="10" fill={`url(#rd${i})`} />
                      <path d="M20.6 8 C20.4 5 18 2.4 14.6 2.2" fill="none" stroke="#fff" strokeOpacity=".75" strokeWidth=".8" strokeLinecap="round" />
                      <rect x="12.6" y="33" width="4.8" height="4.4" rx="1" fill={`url(#hk${i})`} />
                      <path d="M11 37 H19 Q21 37 21.4 39 L22.8 48.5 Q23.2 51 20.8 51 H9.2 Q6.8 51 7.2 48.5 L8.6 39 Q9 37 11 37 Z" fill={`url(#wd${i})`} />
                      <path d="M10.4 39.5 L9.6 48" stroke="#fff" strokeOpacity=".18" strokeWidth=".8" />
                    </svg>
                    <div className="rk-box" ref={el => (boxRefs.current[i] = el)}>
                      <div className="rk-turnwrap" style={{ opacity: lifted[i] ? 0 : 1, mixBlendMode: it.remote ? "multiply" : "normal" }}>
                        <div className="rk-sidewrap" ref={el => (sideRefs.current[i] = el)}><SideHoodie id={i} tone={it.tone} /></div>
                        <img className="rk-photo" ref={el => (frontRefs.current[i] = el)} src={it.cut} alt="" draggable="false" style={{ visibility: "hidden" }} />
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rk-info" aria-live="polite">
          {face ? (
            <div className="rk-line" key={facing}>
              {face.remote && <img className="rk-thumb" src={face.cut} alt="" draggable="false" />}
              {face.name} — <span>{face.price ? fmtBDT(face.price) : "Price coming soon"}</span>
            </div>
          ) : (
            <div className="rk-line muted">{ITEMS.length} hoodies on the rail</div>
          )}
          <div className="rk-acts">
            <button className="rk-avail" onClick={() => onBrowse && onBrowse()}>Grab your hoodie</button>
            <button className="rk-avail rk-try" onClick={() => openTryOn(facing === null ? 0 : facing)}>
              <TryIcon />Try it on
            </button>
          </div>
        </div>
      </div>

      <div className="rk-dim" aria-hidden="true" />
      {ITEMS.map((it, i) => {
        const v = active === i ? it.colors[variant[i]] : it.colors[0];
        return (
          <div key={it.id} className="rk-fly" ref={el => (flyRefs.current[i] = el)} aria-hidden="true">
            <img src={v.img} alt="" className={v.photo ? "photo" : ""} draggable="false" />
            {!v.photo && <div className="rk-sweep" style={{ "--m": `url(${v.img})` }} />}
          </div>
        );
      })}

      <aside className="rk-card" aria-hidden={!sel}>
        {sel && (
          <div className="rk-reveal" key={active}>
            <button className="rk-back" ref={backRef} onClick={close}>← Back to rail</button>
            <div>
              <div className="rk-eyebrow">{String(active + 1).padStart(2, "0")} / {String(ITEMS.length).padStart(2, "0")}</div>
              <div className="rk-name">{sel.name}</div>
            </div>
            <div className="rk-price">{hasPrice ? fmtBDT(sel.price) : "Price coming soon"}</div>
            <div className="rk-note">{sel.note}</div>
            <div>
              <div className="rk-lbl">Colour · {selVar.name}</div>
              <div className="rk-sws">
                {sel.colors.map((c, k) => (
                  <button key={c.name} className="rk-sw" aria-pressed={k === variant[active]} aria-label={`Colour ${c.name}`}
                    onClick={() => { setVariant(v => v.map((x, j) => (j === active ? k : x))); setAdded(false); }}>
                    <i style={{ background: c.hex }} />{c.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="rk-lbl">Select size</div>
              <div className="rk-sizes">
                {SIZES.map(s => (
                  <button key={s} className="rk-size" aria-pressed={s === size} onClick={() => { setSize(s); setAdded(false); }}>{s}</button>
                ))}
              </div>
            </div>
            <button className="rk-trybtn" onClick={() => openTryOn(active)}><TryIcon />Try it on — avatar or your photo</button>
            <div className="rk-addwrap">
              <button className={"rk-add" + (added ? " done" : "")} onClick={add} disabled={!hasPrice || !size}>
                {!hasPrice ? "Coming soon" : added ? "Added to cart ✓" : size ? "Add to cart" : "Choose a size"}
              </button>
              {burst > 0 && added && BURST.map((c, k) => <span key={burst + "-" + k} className="rk-fx" style={{ background: c, "--a": k * 45 + "deg" }} />)}
            </div>
          </div>
        )}
      </aside>

      {tryOn !== null && (
        <Suspense fallback={<div className="rk-tryload" role="status"><span />Opening the fitting room…</div>}>
          <TryOn items={ITEMS} start={tryOn} onClose={() => setTryOn(null)} onAdd={onAdd} />
        </Suspense>
      )}
    </section>
  );
}
