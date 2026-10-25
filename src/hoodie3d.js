// ─────────────────────────────────────────────────────────────
//  3D HOODIES ON THE RAIL
//  Every hoodie on the rail is a real 3D render (Blender, cloth-simulated
//  fleece on a hanger) shot as a turntable: one frame every 6°, from
//  -6° (just past facing you) to 84° (side-on). The rail picks the frame
//  for the hoodie's current angle and cross-fades to the next one, so a
//  hoodie turning on its hanger looks like a smooth 3D rotation.
//
//  public/3d/rail/<key>/<angle>.webp  → our own hoodies, print included
//  public/3d/rail/generic/d<angle>.webp + k<angle>.webp
//                                       → a plain hoodie for shop items,
//                                         tinted to the item's colour here
//  To give a new hoodie of ours its own renders, add its id → folder below.
// ─────────────────────────────────────────────────────────────
export const SPIN_ANGLES = [-6, 0, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84];
export const SPIN_REST = 72;   // the angle a hoodie hangs at on the rail (front facing right)
export const SPIN_FILES = { 101: "bow", 102: "meow", 103: "okay", 105: "tribal", 106: "chicken" };
const ROOT = "/3d/rail";
const STEP = SPIN_ANGLES[1] - SPIN_ANGLES[0];

const imgs = new Map(); // url -> { img, ok, fail, waiters:Set }
function getImg(url, onReady) {
  let e = imgs.get(url);
  if (!e) {
    const img = new Image();
    img.decoding = "async";
    e = { img, ok: false, fail: false, waiters: new Set() };
    imgs.set(url, e);
    img.onload = () => { e.ok = true; e.waiters.forEach(f => f()); e.waiters.clear(); };
    img.onerror = () => { e.fail = true; e.waiters.forEach(f => f()); e.waiters.clear(); };
    img.src = url;
  }
  if (!e.ok && !e.fail && onReady) e.waiters.add(onReady);
  return e;
}

export const frameIndex = a => Math.max(0, Math.min(SPIN_ANGLES.length - 1, (a - SPIN_ANGLES[0]) / STEP));
export const houseFrame = (key, angle) => `${ROOT}/${key}/${angle}.webp`;

let scratch = null; // shared canvases for tinting shop hoodies
function scratchCanvas(n, w, h) {
  if (!scratch) scratch = [document.createElement("canvas"), document.createElement("canvas")];
  const c = scratch[n];
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  return c;
}

// Draws one hoodie's turntable into a <canvas> at any angle.
export class Spinner {
  constructor(canvas, spec) {
    this.canvas = canvas;
    this.spec = spec;            // { key } for our own hoodies, { tone } for shop hoodies
    this.angle = null;
    this.drawn = "";
    this.dead = false;
    this.redraw = () => { if (!this.dead && this.angle !== null) { this.drawn = ""; this.draw(this.angle); } };
  }
  urls(i) {
    const a = SPIN_ANGLES[i];
    return this.spec.key ? [houseFrame(this.spec.key, a)] : [`${ROOT}/generic/d${a}.webp`, `${ROOT}/generic/k${a}.webp`];
  }
  ready(i) {
    return this.urls(i).map(u => getImg(u, this.redraw)).every(e => e.ok);
  }
  failed(i) { return this.urls(i).some(u => getImg(u).fail); }
  // load every frame (cheap: ~10 KB each), nearest to the current angle first
  preload() {
    const c = this.angle === null ? frameIndex(SPIN_REST) : frameIndex(this.angle);
    SPIN_ANGLES.map((_, i) => i).sort((p, q) => Math.abs(p - c) - Math.abs(q - c)).forEach(i => this.urls(i).forEach(u => getImg(u, this.redraw)));
  }
  size() {
    const c = this.canvas; if (!c) return null;
    // layout size (not getBoundingClientRect: the hanger sways, which would resize the canvas every tick)
    const cw = c.offsetWidth, ch = c.offsetHeight;
    if (!cw || !ch) return null;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(cw * dpr), h = Math.round(ch * dpr);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; this.drawn = ""; }
    return [w, h];
  }
  paintFrame(ctx, i, w, h, alpha, add) {
    const [u0, u1] = this.urls(i);
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = add ? "lighter" : "source-over";
    if (this.spec.key) { ctx.drawImage(getImg(u0).img, 0, 0, w, h); return; }
    // shop hoodie: shading (d) × colour + sheen/hanger layer (k)
    const s = scratchCanvas(add ? 1 : 0, w, h), x = s.getContext("2d");
    x.globalAlpha = 1;
    x.globalCompositeOperation = "copy"; x.drawImage(getImg(u0).img, 0, 0, w, h);
    x.globalCompositeOperation = "multiply"; x.fillStyle = this.spec.tone || "#3A3A3D"; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = "destination-in"; x.drawImage(getImg(u0).img, 0, 0, w, h);
    x.globalCompositeOperation = "lighter"; x.drawImage(getImg(u1).img, 0, 0, w, h);
    x.globalCompositeOperation = "source-over";
    ctx.drawImage(s, 0, 0, w, h);
  }
  // nearest loaded frame to index f (so a hoodie never blinks out while frames stream in)
  nearestReady(f) {
    let best = -1, bd = 1e9;
    for (let i = 0; i < SPIN_ANGLES.length; i++) {
      if (!this.ready(i)) continue;
      const dd = Math.abs(i - f);
      if (dd < bd) { bd = dd; best = i; }
    }
    return best;
  }
  draw(angle) {
    if (this.dead) return;
    this.angle = angle;
    const sz = this.size(); if (!sz) return;
    const [w, h] = sz;
    const f = frameIndex(angle);
    let i0 = Math.floor(f), i1 = Math.min(SPIN_ANGLES.length - 1, i0 + 1), t = f - i0;
    if (!this.ready(i0) || !this.ready(i1)) {
      const n = this.nearestReady(f);
      if (n < 0) return;
      i0 = i1 = n; t = 0;
    }
    if (t < 0.03) t = 0; else if (t > 0.97) { i0 = i1; t = 0; }
    const sig = `${i0}|${i1}|${t.toFixed(2)}|${w}`;
    if (sig === this.drawn) return;
    this.drawn = sig;
    const ctx = this.canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, w, h);
    this.paintFrame(ctx, i0, w, h, 1 - t, false);
    if (t > 0) this.paintFrame(ctx, i1, w, h, t, true);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    this.copyMirror();
  }
  // also paint every frame into a second canvas (the hoodie lifting off the rail)
  setMirror(canvas) {
    this.mirror = canvas || null;
    this.copyMirror();
  }
  copyMirror() {
    const m = this.mirror, c = this.canvas;
    if (!m || !c || !c.width) return;
    if (m.width !== c.width || m.height !== c.height) { m.width = c.width; m.height = c.height; }
    const x = m.getContext("2d");
    x.clearRect(0, 0, m.width, m.height);
    x.drawImage(c, 0, 0);
  }
  dispose() { this.dead = true; this.mirror = null; }
}

// which renders a rail item uses
export const spinSpec = item => (SPIN_FILES[item.id] ? { key: SPIN_FILES[item.id] } : { tone: item.tone || "#3A3A3D" });
