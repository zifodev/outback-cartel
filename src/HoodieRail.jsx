import { useState, useRef, useEffect } from "react";

// ─────────────────────────────────────────────────────────────
//  HOODIE RACK — section shown on the shop home page.
//  Hoodies hang side-on on a chrome rail. Hover (or tap) one and it
//  turns to face you. Click it (or "See availability") and it lifts
//  off the rail into the foreground with price, colours, sizes and
//  ADD TO CART. Esc / Back / clicking the dark area puts it back.
//
//  Images live in public/hoodies/ (cut-*.webp = background removed).
//  EDIT HERE: names, notes, colours and PRICES (in ৳).
//  While price is 0 the card shows "Price coming soon" and the
//  ADD TO CART button stays disabled.
// ─────────────────────────────────────────────────────────────
const HOUSE_ITEMS = [
  { id: 101, name: "Bow Print Hoodie", price: 990, old: 1290, note: "Pink fleece hoodie with a black bow graphic.", cut: "hoodies/cut-bow.webp",
    colors: [{ name: "Pink", hex: "#F4B8C8", img: "hoodies/cut-bow.webp" }] },
  { id: 102, name: "Meow Cat Hoodie", price: 990, old: 1290, note: "Pink fleece hoodie with a peeking cat print.", cut: "hoodies/cut-meow.webp",
    colors: [{ name: "Pink", hex: "#F2B7C9", img: "hoodies/cut-meow.webp" }] },
  { id: 103, name: "I'm OK Hoodie", price: 1090, old: 1390, note: "Cartoon print hoodie, soft fleece inside.", cut: "hoodies/cut-okay-grey.webp",
    colors: [{ name: "Grey", hex: "#C3C6C4", img: "hoodies/cut-okay-grey.webp" }, { name: "Pink", hex: "#F0B8B0", img: "hoodies/okay-pink.png", photo: true }] },
  { id: 105, name: "Tribal Mark Hoodie", price: 1090, old: 1390, note: "Black hoodie with a white tribal-style graphic.", cut: "hoodies/cut-tribal.webp",
    colors: [{ name: "Black", hex: "#1C1C1C", img: "hoodies/cut-tribal.webp" }] },
  { id: 106, name: "Beware of Chicken Hoodie", price: 1090, old: 1390, note: "Black hoodie with a bold lettered print.", cut: "hoodies/cut-chicken.webp",
    colors: [{ name: "Black", hex: "#1C1C1C", img: "hoodies/cut-chicken.webp" }] },
];

// hoodies from the shop (supplier range) hung on the rail after our own ones
const RAIL_MAX = 12;
const toItem = p => ({
  id: p.id, name: p.name, price: p.price || 0, old: p.old || 0, remote: true,
  note: "From our hoodie range. Pick a size and add to cart.",
  cut: p.img,
  colors: [{ name: (Array.isArray(p.colors) && p.colors[0]) || "Standard", hex: "#8A8070", img: p.img, photo: true }],
});

const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const SIDE = 72; // degrees a garment is turned when hanging side-on
const fmtBDT = n => "৳" + Number(n).toLocaleString();
const REDUCED = () => typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const TF = (x, y, s, r) => `perspective(1400px) translate3d(${x}px,${y}px,0px) scale(${s}) rotateY(${r}deg)`;
const SHADOW_REST = "drop-shadow(0px 10px 10px rgba(0,0,0,0.18))";
const SHADOW_HERO = "drop-shadow(0px 40px 34px rgba(0,0,0,0.50))";

function ChromeHanger({ uid }) {
  return (
    <svg className="rk-hanger" viewBox="0 0 210 60" aria-hidden="true">
      <defs>
        <linearGradient id={`ch${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8d8d88" /><stop offset=".35" stopColor="#f6f6f2" /><stop offset=".6" stopColor="#a4a49f" /><stop offset="1" stopColor="#6a6a65" />
        </linearGradient>
      </defs>
      <path d="M105 26V18C105 12 97 10 97 4C97 -1 101 -4 106 -4C111 -4 114 -1 114 3" stroke={`url(#ch${uid})`} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M105 26L34 50Q24 54 32 57L178 57Q186 54 176 50Z" stroke={`url(#ch${uid})`} strokeWidth="3" fill="none" strokeLinejoin="round" />
    </svg>
  );
}

// colours follow the existing site theme: dark #1C1C1C, red #C8392B, gold #E8A020, bg #F5F3EF
const CSS = `
.rk{position:relative;overflow:hidden;background:#F5F3EF;color:#1C1C1C;border-bottom:1px solid #E8E4DE;font-family:inherit;
  --bw:210px;--bh:262px;--rest:58px;--face:236px}
.rk *{box-sizing:border-box}
.rk button{font-family:inherit;cursor:pointer}
.rk button:focus-visible{outline:2px solid #1C1C1C;outline-offset:3px}
.rk:before{content:"";position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(rgba(28,28,28,.07) 1px,transparent 1px);background-size:18px 18px}

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

/* the rack */
.rk-rack{position:relative;max-width:980px;margin:40px auto 0;padding-top:0}
.rk-rod{position:absolute;left:4%;right:4%;top:0;height:8px;border-radius:5px;z-index:1;background:linear-gradient(180deg,#fbfbf8 0%,#cfcfca 35%,#7f7f79 65%,#bdbdb8 100%);box-shadow:0 8px 12px rgba(28,28,28,.18);transform-origin:center;animation:rkRod .9s cubic-bezier(.2,.8,.2,1) both}
.rk-end{position:absolute;top:-5px;width:18px;height:18px;border-radius:50%;z-index:1;background:radial-gradient(circle at 35% 30%,#fff,#bdbdb8 55%,#6d6d68);box-shadow:0 3px 6px rgba(28,28,28,.3)}
.rk-el{left:calc(4% - 9px)}.rk-er{right:calc(4% - 9px)}
@keyframes rkRod{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.rk-row{position:relative;display:flex;justify-content:center;align-items:flex-start;gap:4px;height:calc(var(--bh) + 64px);touch-action:pan-y;user-select:none;cursor:grab}
.rk-row:active{cursor:grabbing}
.rk-pend{position:relative;width:100%;height:100%;transform-origin:50% 0;will-change:transform}

.rk-slot{position:relative;flex:none;width:var(--rest);height:100%;border:0;background:transparent;padding:0;z-index:2;transition:width .75s cubic-bezier(.2,.8,.2,1);animation:rkIn .8s cubic-bezier(.2,.9,.3,1.2) both;animation-delay:calc(var(--i) * 90ms + 250ms)}
.rk-slot[data-face="true"]{width:var(--face);z-index:4}
@keyframes rkIn{0%{opacity:0;transform:translateY(-70px) rotate(-7deg)}60%{opacity:1}100%{opacity:1;transform:translateY(0) rotate(0)}}
.rk-sway{position:absolute;left:50%;top:-6px;width:var(--bw);margin-left:calc(var(--bw) / -2);transform-origin:50% 2px;animation:rkSway 5.5s ease-in-out infinite;animation-delay:calc(var(--i) * -1.3s)}
@keyframes rkSway{0%,100%{transform:rotate(-.9deg)}50%{transform:rotate(.9deg)}}
/* a hoodie turning on its hanger: cloth narrows as it turns away, with a little
   overshoot and sway so it feels like fabric rather than a flat cut-out spinning */
.rk-turn{transform-origin:50% 30%;transform:scaleX(.44) skewY(-2.5deg);transition:transform 1s cubic-bezier(.25,1.35,.4,1);will-change:transform}
.rk-slot[data-face="true"] .rk-turn{transform:scaleX(1) skewY(0deg)}
.rk-hanger{display:block;width:100%;height:auto;overflow:visible;filter:drop-shadow(0 2px 2px rgba(0,0,0,.12))}
.rk-box{position:relative;width:var(--bw);height:var(--bh);margin-top:-14px}
.rk-box img{display:block;width:100%;height:100%;object-fit:contain;object-position:50% 0;filter:brightness(.86) saturate(.95) drop-shadow(0 12px 10px rgba(28,28,28,.2));transition:filter .9s ease,opacity .15s}
.rk-slot[data-face="true"] .rk-box img{filter:brightness(1) saturate(1) drop-shadow(0 18px 16px rgba(28,28,28,.28))}
.rk-h-touch{display:none}
/* shop hoodies (product photos) hang as clipped photo cards on the hanger */
.rk-box[data-photo="true"]{width:calc(var(--bw) * .74);height:calc(var(--bh) * .8);margin:-8px auto 0;background:#fff;padding:7px 7px 26px;border-radius:4px;box-shadow:0 12px 20px rgba(28,28,28,.2),0 1px 0 rgba(0,0,0,.06)}
.rk-box[data-photo="true"]:before{content:"";position:absolute;top:-9px;left:50%;width:24px;height:13px;margin-left:-12px;border-radius:2px;z-index:2;background:linear-gradient(180deg,#f6f6f2,#a4a49f 60%,#6a6a65);box-shadow:0 1px 2px rgba(0,0,0,.3)}
.rk-box[data-photo="true"] img{object-fit:cover;object-position:50% 30%;border-radius:2px;filter:brightness(.9)}
.rk-ptag{position:absolute;left:0;right:0;bottom:5px;text-align:center;font-size:12px;font-weight:800;color:#C8392B;letter-spacing:.02em;transition:opacity .15s}

.rk-info{min-height:76px;margin-top:6px;display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;transition:opacity .3s}
.rk-line{font-size:14px;font-weight:600;color:#1C1C1C;animation:rkFade .35s ease both}
.rk-line span{color:#C8392B;font-weight:800}
.rk-line.muted{color:#8A8070;font-weight:500}
@keyframes rkFade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.rk-avail{border:1.5px solid #1C1C1C;background:transparent;color:#1C1C1C;border-radius:999px;padding:8px 18px;font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;transition:background .2s,color .2s,transform .15s}
.rk-avail:hover{background:#1C1C1C;color:#fff;transform:translateY(-2px)}
.rk-avail:disabled{opacity:.35;cursor:default;transform:none;background:transparent;color:#1C1C1C}
.rk[data-on="true"] .rk-info{opacity:0}

/* dim room + spotlight */
.rk-dim{position:absolute;inset:0;z-index:10;pointer-events:none;opacity:0;transition:opacity .6s ease;background:radial-gradient(closest-side at var(--cx,40%) var(--cy,50%),rgba(255,236,205,.30),rgba(28,28,28,0) 72%),rgba(28,28,28,.64)}
.rk[data-on="true"] .rk-dim{opacity:1}
.rk[data-on="true"]{cursor:zoom-out}
.rk[data-on="true"] .rk-slot,.rk[data-on="true"] .rk-card{cursor:default}
.rk[data-on="true"] .rk-slot{cursor:pointer}

/* the garment that comes off the rail */
.rk-fly{position:absolute;z-index:20;display:none;will-change:transform,filter;transform:${TF(0, 0, 1, 0)}}
.rk-fly img{display:block;width:100%;height:100%;object-fit:contain;object-position:50% 0}
.rk-fly img.photo{object-fit:cover;object-position:50% 20%;border-radius:12px}
.rk-sweep{position:absolute;inset:0;pointer-events:none;background:linear-gradient(110deg,rgba(255,244,225,0) 40%,rgba(255,244,225,.45) 50%,rgba(255,244,225,0) 60%);background-size:300% 100%;background-position:150% 0;opacity:0;mix-blend-mode:soft-light;-webkit-mask:var(--m) center top/contain no-repeat;mask:var(--m) center top/contain no-repeat}
.rk-fly[data-sweep="1"] .rk-sweep{animation:rkSweep 1.3s ease .6s both}
@keyframes rkSweep{0%{background-position:150% 0;opacity:1}100%{background-position:-50% 0;opacity:1}}

/* product card */
.rk-card{position:absolute;z-index:30;top:70px;right:max(18px,calc((100% - 1200px) / 2 + 18px));width:330px;background:#fff;border:1px solid #E8E4DE;border-radius:16px;padding:22px;box-shadow:0 20px 50px rgba(0,0,0,.25);
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
.rk-eyebrow{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#8A8070;font-weight:700}
.rk-name{font-weight:800;font-size:22px;line-height:1.15;margin-top:6px}
.rk-price{font-size:20px;font-weight:800;color:#C8392B}
.rk-note{font-size:13px;color:#8A8070;line-height:1.5}
.rk-lbl{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px}
.rk-sws{display:flex;gap:10px;flex-wrap:wrap}
.rk-sw{display:inline-flex;align-items:center;gap:8px;padding:6px 12px 6px 6px;border-radius:999px;border:2px solid #E8E4DE;background:#fff;font-size:12px;font-weight:700;color:#1C1C1C;transition:border-color .2s,transform .15s}
.rk-sw i{width:22px;height:22px;border-radius:50%;border:1px solid rgba(0,0,0,.25);display:block}
.rk-sw[aria-pressed="true"]{border-color:#1C1C1C}
.rk-sw:active{transform:scale(.95)}
.rk-sizes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.rk-size{height:44px;border-radius:10px;font-size:13px;font-weight:700;background:#fff;color:#1C1C1C;border:2px solid #E8E4DE;transition:transform .15s,background .2s,color .2s,border-color .2s}
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
  .rk{--bw:170px;--bh:212px;--rest:34px;--face:186px}
  .rk-in{padding:26px 12px 20px;min-height:760px}
  .rk-title{font-size:30px}
  .rk-rack{margin-top:30px}
  .rk-card{top:auto;bottom:12px;left:12px;right:12px;width:auto;padding:18px;transform:translateY(34px)}
  .rk[data-on="true"] .rk-card{transform:translateY(0)}
  .rk-sizes{grid-template-columns:repeat(6,minmax(0,1fr))}
  .rk-size{height:40px}
  /* phones: hoodies hang side by side on a swipeable rail (no overlapping) */
  .rk{--bw:150px;--bh:196px;--rest:150px;--face:150px}
  .rk-row{gap:16px;padding:6px 0 0;height:calc(var(--bh) + 80px);margin:0 -12px}
  .rk-h-web{display:none}
  .rk-h-touch{display:inline}
}
@media (prefers-reduced-motion:reduce){
  .rk *,.rk *:before{animation:none!important;transition:none!important}
}
`;

const BURST = ["#C8392B", "#E8A020", "#2E7D52", "#1F3A8A", "#DB2777", "#1C1C1C", "#E8A020", "#C8392B"];

export default function HoodieRail({ onAdd, onBrowse, extra = [] }) {
  const ITEMS = [...HOUSE_ITEMS, ...extra.map(toItem)].slice(0, RAIL_MAX);
  const [facing, setFacing] = useState(null);   // garment turned towards the viewer
  const [active, setActive] = useState(null);   // garment pulled off the rail
  const [lifted, setLifted] = useState(() => ITEMS.map(() => false));
  const [variant, setVariant] = useState(() => ITEMS.map(() => 0));
  const [size, setSize] = useState(null);
  const [added, setAdded] = useState(false);
  const [burst, setBurst] = useState(0);
  const [dimPos, setDimPos] = useState({ cx: "40%", cy: "50%" });

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

  // total width of the hoodies on the rail (they overflow both sides of the row on phones)
  const contentW = () => {
    const row = rowRef.current; if (!row) return 0;
    const kids = Array.from(row.children);
    const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    return kids.reduce((w, k) => w + k.offsetWidth, 0) + gap * Math.max(0, kids.length - 1);
  };
  const maxX = () => {
    const sec = secRef.current;
    if (!rowRef.current || !sec) return 0;
    return Math.max(0, (contentW() - sec.clientWidth) / 2 + 70);
  };
  const paint = () => {
    if (rowRef.current) rowRef.current.style.transform = `translate3d(${railX.current}px,0,0)`;
    pendRefs.current.forEach((el, i) => { if (el) el.style.transform = `rotate(${hang.current[i].a}deg)`; });
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
    let busy = d.on || Math.abs(railV.current) > 0.05 || Math.abs(railX.current - railT.current) > 0.05;
    hang.current.forEach(h => {
      h.v += (-90 * (h.a - lag) - 7 * h.v) * dt;
      h.a += h.v * dt;
      if (Math.abs(h.a) > 0.05 || Math.abs(h.v) > 0.05) busy = true;
    });
    paint();
    loopId.current = busy ? requestAnimationFrame(tick) : 0;
  }
  const kick = () => {
    if (loopId.current) return;
    lastTs.current = performance.now();
    loopId.current = requestAnimationFrame(tick);
  };
  // on phones the rail is wider than the screen: start with the first hoodie in view
  useEffect(() => {
    const row = rowRef.current, sec = secRef.current;
    if (!row || !sec || sec.clientWidth >= 700) return;
    const start = Math.max(0, (contentW() - sec.clientWidth) / 2 + 24);
    railX.current = railT.current = start;
    paint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
      const raw = d.base + dx, m = maxX();
      railX.current = raw > m ? m + (raw - m) * 0.35 : raw < -m ? -m + (raw + m) * 0.35 : raw; // rubber-band at the ends
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
        const m = maxX();
        railV.current = d.vx;
        railT.current = Math.max(-m, Math.min(m, railX.current + d.vx * 0.25));
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
      setFacing(f => (f === null ? 0 : (f + 1) % ITEMS.length));
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

  const openFlyer = (i, fromSide) => {
    const fly = flyRefs.current[i];
    const g = measure(i);
    if (!fly || !g) return;
    const quick = REDUCED();
    const wasOut = fly.style.display === "block";
    stopAnim(i);
    Object.assign(fly.style, { left: g.sx + "px", top: g.sy + "px", width: g.w + "px", height: g.h + "px", transformOrigin: "50% 0" });
    const start = TF(0, 0, 1, fromSide ? SIDE : 0);
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
    const fromSide = facing !== i;
    if (active !== null) closeFlyer(active);
    setFacing(i);
    setLifted(l => l.map((v, k) => (k === i ? true : v)));
    openFlyer(i, fromSide);
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
    if (active === null) return;
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
          <p className="rk-hint"><span className="rk-h-web">Hover a hoodie to turn it. Click to take it off the rail.</span><span className="rk-h-touch">Swipe along the rail. Tap a hoodie to turn it, tap again to take it off.</span></p>
        </div>

        <div className="rk-rack" onMouseLeave={() => { if (active === null && interacted.current) setFacing(null); }}>
          <div className="rk-rod" /><div className="rk-end rk-el" /><div className="rk-end rk-er" />
          <div className="rk-row" ref={rowRef} onPointerDown={onRowDown}>
            {ITEMS.map((it, i) => (
              <button key={it.id} ref={el => (slotRefs.current[i] = el)} className="rk-slot" style={{ "--i": i }}
                data-face={facing === i} aria-pressed={active === i} aria-label={`${it.name}${it.price ? ", " + fmtBDT(it.price) : ""}. Open details`}
                onMouseEnter={() => { touch(); if (active === null && !dragS.current.on) setFacing(i); }}
                onFocus={() => { if (active === null) setFacing(i); }}
                onKeyDown={e => slotKey(e, i)}
                onClick={() => slotClick(i)}>
                <div className="rk-pend" ref={el => (pendRefs.current[i] = el)}>
                  <div className="rk-sway">
                    <ChromeHanger uid={i} />
                    <div className="rk-turn">
                      <div className="rk-box" data-photo={it.remote ? "true" : undefined} ref={el => (boxRefs.current[i] = el)}>
                        <img src={it.cut} alt="" loading="lazy" style={{ opacity: lifted[i] ? 0 : 1 }} draggable="false" />
                        {it.remote && <span className="rk-ptag" style={{ opacity: lifted[i] ? 0 : 1 }}>{it.price ? fmtBDT(it.price) : ""}</span>}
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
            <>
              <div className="rk-line" key={facing}>{face.name} — <span>{face.price ? fmtBDT(face.price) : "Price coming soon"}</span></div>
              <button className="rk-avail" onClick={() => onBrowse && onBrowse()}>Grab your hoodie</button>
            </>
          ) : (
            <>
              <div className="rk-line muted">{ITEMS.length} hoodies on the rail</div>
              <button className="rk-avail" onClick={() => onBrowse && onBrowse()}>Grab your hoodie</button>
            </>
          )}
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
              <div className="rk-eyebrow">Hoodies · {active + 1} of {ITEMS.length}</div>
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
            <div className="rk-addwrap">
              <button className={"rk-add" + (added ? " done" : "")} onClick={add} disabled={!hasPrice || !size}>
                {!hasPrice ? "Coming soon" : added ? "Added to cart ✓" : size ? "Add to cart" : "Choose a size"}
              </button>
              {burst > 0 && added && BURST.map((c, k) => <span key={burst + "-" + k} className="rk-fx" style={{ background: c, "--a": k * 45 + "deg" }} />)}
            </div>
          </div>
        )}
      </aside>
    </section>
  );
}
