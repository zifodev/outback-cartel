import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { FittingScene, SKIN_TONES } from "./tryon/scene.js";
import { SPIN_FILES } from "./hoodie3d.js";

// ─────────────────────────────────────────────────────────────
//  TRY-ON STUDIO — opened from the hoodie rail.
//  Avatar:     a 3D mannequin wearing the hoodie; drag to turn it round.
//  Your photo: upload / take a photo and the hoodie is fitted onto you,
//              posed to your arms and shoulders. Runs on the phone itself,
//              the photo is never uploaded anywhere.
// ─────────────────────────────────────────────────────────────
const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const fmtBDT = n => "৳" + Number(n).toLocaleString();
const FITS = [{ k: 0.94, label: "Slim" }, { k: 1.0, label: "Regular" }, { k: 1.08, label: "Oversized" }];
const BODIES = [{ k: "male", label: "Him", cut: "Men's" }, { k: "female", label: "Her", cut: "Women's" }];

const CSS = `
.to{position:fixed;inset:0;z-index:900;background:rgba(20,18,16,.55);display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',system-ui,sans-serif;color:#1C1C1C;animation:toFade .25s ease both}
@keyframes toFade{from{opacity:0}to{opacity:1}}
.to *{box-sizing:border-box}
.to button{font-family:inherit;cursor:pointer}
.to button:focus-visible{outline:2px solid #1C1C1C;outline-offset:2px}
.to-win{position:relative;width:min(1080px,100%);height:min(92vh,860px);background:#F5F3EF;border-radius:22px;overflow:hidden;display:grid;grid-template-columns:minmax(0,1fr) 360px;box-shadow:0 30px 80px rgba(0,0,0,.35);animation:toUp .35s cubic-bezier(.2,.9,.3,1.05) both}
@keyframes toUp{from{transform:translateY(24px) scale(.98)}to{transform:none}}
.to-stage{position:relative;min-height:0;background:radial-gradient(120% 90% at 50% 18%,#FFFFFF 0%,#F1ECF4 48%,#E3ECDF 100%);overflow:hidden;touch-action:none}
.to-stage:before{content:"";position:absolute;inset:0;pointer-events:none;background-image:radial-gradient(rgba(28,28,28,.05) 1px,transparent 1px);background-size:18px 18px}
.to-gl{position:absolute;inset:0;width:100%;height:100%;display:block}
.to-gl.off{visibility:hidden}
.to-photo{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:14px}
.to-photo canvas{max-width:100%;max-height:100%;border-radius:14px;box-shadow:0 18px 40px rgba(0,0,0,.18);background:#fff;touch-action:none;cursor:grab}
.to-hint{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);background:rgba(28,28,28,.78);color:#fff;font-size:11px;font-weight:700;letter-spacing:.06em;padding:7px 12px;border-radius:999px;white-space:nowrap;pointer-events:none;transition:opacity .4s}
.to-busy{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;font-size:13px;font-weight:700;color:#4a443c;background:rgba(245,243,239,.55);backdrop-filter:blur(2px)}
.to-busy i{width:30px;height:30px;border-radius:50%;border:3px solid #E8E4DE;border-top-color:#C8392B;animation:toSpin .8s linear infinite}
@keyframes toSpin{to{transform:rotate(360deg)}}
.to-side{display:flex;flex-direction:column;min-height:0;border-left:1px solid #E8E4DE;background:#fff}
.to-top{display:flex;align-items:center;gap:10px;padding:16px 16px 10px}
.to-x{width:36px;height:36px;border-radius:50%;border:0;background:#F0EDE8;font-size:16px;font-weight:700;color:#1C1C1C;flex:none}
.to-x:hover{background:#1C1C1C;color:#fff}
.to-title{font-size:18px;font-weight:900;letter-spacing:-.01em;line-height:1.1}
.to-sub{font-size:11px;color:#8A8070;font-weight:600;letter-spacing:.04em}
.to-tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:4px 16px 12px;background:#F0EDE8;padding:4px;border-radius:12px}
.to-tab{height:38px;border:0;border-radius:9px;background:transparent;font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#6b6358;display:flex;align-items:center;justify-content:center;gap:6px}
.to-tab[aria-selected="true"]{background:#1C1C1C;color:#fff;box-shadow:0 4px 12px rgba(0,0,0,.15)}
.to-body{flex:1;min-height:0;overflow-y:auto;padding:0 16px 12px;display:flex;flex-direction:column;gap:14px}
.to-lbl{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#8A8070;margin-bottom:7px}
.to-chips{display:flex;gap:8px;flex-wrap:wrap}
.to-chip{height:36px;padding:0 14px;border-radius:999px;border:2px solid #E8E4DE;background:#fff;font-size:12px;font-weight:800;color:#1C1C1C}
.to-chip[aria-pressed="true"]{border-color:#1C1C1C;background:#1C1C1C;color:#fff}
.to-tone{width:30px;height:30px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 2px #E8E4DE}
.to-tone[aria-pressed="true"]{box-shadow:0 0 0 2px #1C1C1C}
.to-picks{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.to-pick{position:relative;aspect-ratio:1/1.1;border-radius:12px;border:2px solid #E8E4DE;background:#F7F5F2;padding:4px;overflow:hidden}
.to-pick img{width:100%;height:100%;object-fit:contain;display:block}
.to-pick.photo img{object-fit:cover;border-radius:8px}
.to-pick[aria-pressed="true"]{border-color:#C8392B;box-shadow:0 0 0 2px rgba(200,57,43,.18)}
.to-pick b{position:absolute;left:4px;right:4px;bottom:3px;font-size:9px;font-weight:800;color:#1C1C1C;background:rgba(255,255,255,.88);border-radius:6px;padding:1px 3px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.to-up{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;padding:24px;max-width:360px;margin:auto}
.to-up h3{margin:0;font-size:20px;font-weight:900}
.to-up p{margin:0;font-size:13px;color:#6b6358;line-height:1.55}
.to-upbtn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:48px;padding:0 22px;border-radius:999px;border:0;background:#C8392B;color:#fff;font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;box-shadow:0 10px 24px rgba(200,57,43,.3)}
.to-upbtn.ghost{background:#fff;color:#1C1C1C;border:2px solid #1C1C1C;box-shadow:none}
.to-tips{display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;font-size:11.5px;color:#4a443c;text-align:left;margin-top:4px}
.to-tips span:before{content:"✓ ";color:#2E7D52;font-weight:900}
.to-privacy{font-size:11px;color:#2E7D52;font-weight:700;display:flex;align-items:center;gap:6px}
.to-row{display:flex;gap:8px;flex-wrap:wrap}
.to-small{height:36px;padding:0 14px;border-radius:999px;border:2px solid #E8E4DE;background:#fff;font-size:12px;font-weight:800;color:#1C1C1C;display:inline-flex;align-items:center;gap:6px}
.to-small:hover{border-color:#1C1C1C}
.to-note{font-size:11px;color:#8A8070;line-height:1.5}
.to-err{font-size:12.5px;color:#9B2C1F;background:#FEF2F2;border:1px solid #FCA5A5;border-radius:10px;padding:10px 12px;line-height:1.5}
.to-buy{border-top:1px solid #E8E4DE;padding:12px 16px 16px;display:flex;flex-direction:column;gap:10px;background:#fff}
.to-name{display:flex;justify-content:space-between;align-items:baseline;gap:10px;font-size:14px;font-weight:800}
.to-name span{color:#C8392B;white-space:nowrap}
.to-sizes{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px}
.to-size{height:36px;border-radius:999px;border:2px solid #E8E4DE;background:#fff;font-size:12px;font-weight:800;color:#1C1C1C}
.to-size[aria-pressed="true"]{background:#1C1C1C;border-color:#1C1C1C;color:#fff}
.to-add{height:48px;border:0;border-radius:12px;background:#C8392B;color:#fff;font-size:13px;font-weight:800;letter-spacing:.12em;text-transform:uppercase}
.to-add:disabled{background:#E8E4DE;color:#6b6358;cursor:not-allowed}
.to-add.done{background:#2E7D52}
@media (max-width:760px){
  .to{align-items:stretch}
  .to-win{width:100%;height:100%;border-radius:0;grid-template-columns:1fr;grid-template-rows:minmax(0,1fr) auto}
  .to-stage{min-height:0}
  .to-side{border-left:0;border-top:1px solid #E8E4DE;max-height:52vh}
  .to-top{position:absolute;top:0;left:0;right:0;z-index:3;padding:12px;background:linear-gradient(rgba(245,243,239,.95),rgba(245,243,239,0))}
  .to-tabs{margin:10px 12px 8px}
  .to-body{padding:0 12px 10px;gap:10px}
  .to-picks{display:flex;overflow-x:auto;gap:8px;padding-bottom:2px;scroll-snap-type:x mandatory}
  .to-pick{flex:none;width:68px;scroll-snap-align:start}
  .to-buy{padding:10px 12px calc(12px + env(safe-area-inset-bottom))}
  .to-tips{grid-template-columns:1fr}
}
`;

function useScene(canvasRef) {
  const [scene, setScene] = useState(null);
  const [err, setErr] = useState(null);
  useEffect(() => {
    let sc = null;
    try { sc = new FittingScene(canvasRef.current); setScene(sc); }
    catch { setErr("This browser can't show 3D. Try Chrome or Safari, or update your phone's browser."); }
    const onResize = () => sc && sc.resize();
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("resize", onResize); if (sc) sc.dispose(); };
  }, [canvasRef]);
  return [scene, err];
}

// fabric colour + print for the 3D hoodie
const hoodieSpec = (it, v) => {
  const c = it.colors && it.colors[v];
  const tone = v > 0 && c ? c.hex : it.tone;
  return { key: SPIN_FILES[it.id], tone, id: it.id };
};

export default function TryOn({ items, start = 0, onClose, onAdd }) {
  const [idx, setIdx] = useState(start);
  const [variant, setVariant] = useState(0);
  const [mode, setMode] = useState("avatar");
  const [body, setBody] = useState("male");
  const [tone, setTone] = useState(0);
  const [size, setSize] = useState(null);
  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState("Dressing the mannequin…");
  const [hint, setHint] = useState(true);
  const [photo, setPhoto] = useState(null);       // { cv, w, h }
  const [pose, setPose] = useState(null);         // landmarks for the photo
  const [photoErr, setPhotoErr] = useState(null);
  const [fit, setFit] = useState(1);
  const [nudge, setNudge] = useState({ x: 0, y: 0 });
  const glRef = useRef(null), outRef = useRef(null), fileRef = useRef(null), camRef = useRef(null);
  const [scene, sceneErr] = useScene(glRef);
  const it = items[idx];
  const spec = hoodieSpec(it, variant);
  const hasPrice = it.price > 0;

  // close on Esc, lock page scroll behind the studio
  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  // mannequin body
  useEffect(() => {
    if (!scene) return;
    let live = true;
    scene.setBody(body).then(() => { if (live) setBusy(null); }).catch(() => { if (live) setBusy(null); setPhotoErr("The 3D model didn't load. Check your connection and try again."); });
    return () => { live = false; };
  }, [scene, body]);
  // hoodie on the mannequin
  useEffect(() => { if (scene) scene.setHoodie(spec); }, [scene, spec.key, spec.tone, body]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (scene) scene.setSkinTone(SKIN_TONES[tone]); }, [scene, tone]);
  useEffect(() => { const t = setTimeout(() => setHint(false), 4200); return () => clearTimeout(t); }, []);

  // switch modes
  useEffect(() => {
    if (!scene) return;
    if (mode === "avatar") scene.avatarMode();
  }, [scene, mode]);

  // ── photo try-on: draw photo + fitted hoodie + put face/hands back on top
  const compose = useCallback(async () => {
    if (!scene || !photo || !pose || pose.partial === undefined) return;
    await scene.setBody(body);
    await scene.setHoodie(spec);
    const { w, h } = photo;
    const placed = scene.photoMode({ lm: pose.lm, wlm: pose.wlm, w, h, size: fit });
    if (!placed) return;
    scene.matchPhoto(pose.light);
    const layer = scene.renderAt(w, h);
    const out = outRef.current; if (!out) return;
    out.width = w; out.height = h;
    const g = out.getContext("2d");
    g.drawImage(photo.cv, 0, 0);
    g.drawImage(layer, nudge.x, nudge.y);
    // face & hair stay in front of the hood; hands stay in front of the hoodie
    if (pose.mask) {
      const lm = pose.lm, P = i => [lm[i].x * w, lm[i].y * h], V = i => (lm[i].visibility === undefined ? 1 : lm[i].visibility);
      const keep = document.createElement("canvas"); keep.width = w; keep.height = h;
      const k = keep.getContext("2d");
      const blob = (cx, cy, rx, ry, inner) => {
        k.save(); k.translate(cx, cy); k.scale(1, ry / rx);
        const rg = k.createRadialGradient(0, 0, rx * inner, 0, 0, rx);
        rg.addColorStop(0, "rgba(0,0,0,1)"); rg.addColorStop(1, "rgba(0,0,0,0)");
        k.fillStyle = rg; k.beginPath(); k.arc(0, 0, rx, 0, Math.PI * 2); k.fill(); k.restore();
      };
      // head: an ellipse round the face landmarks, tall enough for hair and chin
      const eyeL = P(2), eyeR = P(5), nose = P(0), earL = P(7), earR = P(8);
      const span = Math.max(Math.hypot(earL[0] - earR[0], earL[1] - earR[1]) * (Math.min(V(7), V(8)) > 0.4 ? 1 : 0), Math.hypot(eyeL[0] - eyeR[0], eyeL[1] - eyeR[1]) * 2.3);
      if (V(0) > 0.4 && span > 4) {
        const cx = (eyeL[0] + eyeR[0] + nose[0]) / 3, cy = (eyeL[1] + eyeR[1]) / 2 + span * 0.12;
        blob(cx, cy, span * 0.78, span * 1.12, 0.78);
      }
      k.globalCompositeOperation = "destination-in"; k.drawImage(pose.mask, 0, 0, w, h);
      k.globalCompositeOperation = "source-in"; k.drawImage(photo.cv, 0, 0);
      g.drawImage(keep, 0, 0);
      // hands in front of the hoodie: only skin-coloured pixels around each detected hand
      if (pose.skin) {
        [[15, 17, 19, 21], [16, 18, 20, 22]].forEach(([wr, pi, ix, th]) => {
          if (Math.min(V(pi), V(ix)) < 0.5) return;
          const c = [P(pi), P(ix), P(th)].reduce((a, b) => [a[0] + b[0] / 3, a[1] + b[1] / 3], [0, 0]);
          const wp = P(wr), d = Math.hypot(c[0] - wp[0], c[1] - wp[1]) + 3, r = d * 1.4 + 4;
          const cx = c[0] + (c[0] - wp[0]) * 0.3, cy = c[1] + (c[1] - wp[1]) * 0.3;
          const hand = skinPatch(photo.cv, pose.mask, pose.skin, cx, cy, r);
          if (hand) g.drawImage(hand.cv, hand.x, hand.y);
        });
      }
    }
  }, [scene, photo, pose, fit, nudge, body, spec.key, spec.tone]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (mode === "photo") compose(); }, [mode, compose]);
  // opening the photo tab starts loading the body-finder, so it's ready by the time a photo is picked
  useEffect(() => { if (mode === "photo") import("./tryon/pose.js").then(m => m.warmUp()).catch(() => {}); }, [mode]);

  const onFile = async file => {
    if (!file) return;
    setPhotoErr(null); setPose(null); setNudge({ x: 0, y: 0 });
    setBusy("Getting the fitting room ready…");
    try {
      const img = await loadImage(file);
      const max = 1280, sc = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * sc), h = Math.round(img.height * sc);
      const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
      cv.getContext("2d").drawImage(img, 0, 0, w, h);
      setPhoto({ cv, w, h });
      const { findBody, warmUp } = await import("./tryon/pose.js");
      await warmUp();
      setBusy("Finding your shoulders…");
      const res = await findBody(cv);
      if (!res) { setPhotoErr("We couldn't find a person in that photo. Try one where you face the camera with your shoulders and chest in view."); setBusy(null); return; }
      if (res.partial) { setPhotoErr("Your shoulders need to be in the picture. Step back a little so your upper body shows, then try again."); setBusy(null); return; }
      res.light = photoLight(cv, res.lm);
      res.skin = skinTone(cv, res.lm);
      setPose(res);
      setBusy(null);
    } catch {
      setPhotoErr("Something went wrong loading the try-on. Check your connection and try again.");
      setBusy(null);
    }
  };

  // drag the hoodie a little to line it up
  const drag = useRef(null);
  const onDown = e => {
    if (!pose) return;
    const r = e.currentTarget.getBoundingClientRect(), k = photo.w / r.width;
    drag.current = { x: e.clientX, y: e.clientY, k, base: { ...nudge } };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = e => {
    const d = drag.current; if (!d) return;
    setNudge({ x: Math.round(d.base.x + (e.clientX - d.x) * d.k), y: Math.round(d.base.y + (e.clientY - d.y) * d.k) });
  };
  const onUp = () => { drag.current = null; };

  const save = () => {
    const out = outRef.current; if (!out) return;
    out.toBlob(async blob => {
      if (!blob) return;
      const file = new File([blob], "outback-cartel-try-on.jpg", { type: "image/jpeg" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: it.name }); return; } catch { /* fall back to download */ }
      }
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }, "image/jpeg", 0.92);
  };

  const add = () => {
    if (!size || !hasPrice) return;
    const c = it.colors[variant] || it.colors[0];
    onAdd({ id: `${it.id}-${c.name}-${size}`, name: `${it.name} · ${c.name} (${size})`, cat: "clothing", price: it.price, old: 0, icon: "🧥", badge: null, img: c.img });
    setAdded(true);
  };

  return createPortal(
    <div className="to" role="dialog" aria-modal="true" aria-label="Try-On studio" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <style>{CSS}</style>
      <div className="to-win">
        <div className="to-stage">
          <canvas ref={glRef} className={"to-gl" + (mode === "photo" ? " off" : "")} />
          {mode === "avatar" && hint && !busy && <div className="to-hint">Drag to turn · pinch to zoom</div>}
          {mode === "photo" && (
            <div className="to-photo">
              {photo && pose ? (
                <canvas ref={outRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} aria-label="You wearing the hoodie" />
              ) : (
                <div className="to-up">
                  <h3>See it on you</h3>
                  <p>Upload a photo of yourself facing the camera. We fit the hoodie to your shoulders and arms.</p>
                  <div className="to-row" style={{ justifyContent: "center" }}>
                    <button className="to-upbtn" onClick={() => fileRef.current && fileRef.current.click()}>Upload photo</button>
                    <button className="to-upbtn ghost" onClick={() => camRef.current && camRef.current.click()}>Take photo</button>
                  </div>
                  <div className="to-tips"><span>Face the camera</span><span>Shoulders &amp; waist in view</span><span>Arms relaxed by your sides</span><span>Good light, plain background</span></div>
                  <div className="to-privacy">🔒 Your photo stays on your device — it's never uploaded.</div>
                  {photoErr && <div className="to-err">{photoErr}</div>}
                </div>
              )}
            </div>
          )}
          {(busy || (!scene && !sceneErr)) && <div className="to-busy"><i />{busy || "Opening the fitting room…"}</div>}
          {sceneErr && <div className="to-busy"><div className="to-err" style={{ maxWidth: 320 }}>{sceneErr}</div></div>}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { onFile(e.target.files[0]); e.target.value = ""; }} />
          <input ref={camRef} type="file" accept="image/*" capture="user" hidden onChange={e => { onFile(e.target.files[0]); e.target.value = ""; }} />
        </div>

        <div className="to-side">
          <div className="to-top">
            <button className="to-x" onClick={onClose} aria-label="Close" autoFocus>✕</button>
            <div><div className="to-title">Fitting room</div><div className="to-sub">Outback Cartel · Try-On</div></div>
          </div>
          <div className="to-tabs" role="tablist">
            <button className="to-tab" role="tab" aria-selected={mode === "avatar"} onClick={() => setMode("avatar")}>🧍 Avatar</button>
            <button className="to-tab" role="tab" aria-selected={mode === "photo"} onClick={() => setMode("photo")}>📷 Your photo</button>
          </div>
          <div className="to-body">
            <div>
              <div className="to-lbl">{mode === "avatar" ? "Model" : "Cut"}</div>
              <div className="to-chips">
                {BODIES.map(b => <button key={b.k} className="to-chip" aria-pressed={body === b.k} onClick={() => { if (b.k !== body) { setBusy("Dressing the mannequin…"); setBody(b.k); } }}>{mode === "avatar" ? b.label : b.cut}</button>)}
                {mode === "avatar" && SKIN_TONES.map((c, k) => <button key={c} className="to-tone" style={{ background: c }} aria-pressed={tone === k} aria-label={k === 0 ? "Mannequin" : `Skin tone ${k}`} onClick={() => setTone(k)} />)}
              </div>
            </div>
            {mode === "avatar" ? null : (
              <>
                {photo && pose && (
                  <div>
                    <div className="to-lbl">Fit</div>
                    <div className="to-chips">
                      {FITS.map(f => <button key={f.label} className="to-chip" aria-pressed={fit === f.k} onClick={() => setFit(f.k)}>{f.label}</button>)}
                    </div>
                    <div className="to-row" style={{ marginTop: 10 }}>
                      <button className="to-small" onClick={() => fileRef.current && fileRef.current.click()}>↺ New photo</button>
                      <button className="to-small" onClick={save}>⤓ Save picture</button>
                      {(nudge.x || nudge.y) ? <button className="to-small" onClick={() => setNudge({ x: 0, y: 0 })}>Re-centre</button> : null}
                    </div>
                    <div className="to-note" style={{ marginTop: 8 }}>Drag the picture to line the hoodie up. A preview only — check the size chart for fit.</div>
                    {photoErr && <div className="to-err" style={{ marginTop: 8 }}>{photoErr}</div>}
                  </div>
                )}
              </>
            )}
            <div>
              <div className="to-lbl">Pick a hoodie</div>
              <div className="to-picks">
                {items.map((x, i) => (
                  <button key={x.id} className={"to-pick" + (x.remote ? " photo" : "")} aria-pressed={i === idx} aria-label={x.name} onClick={() => { setIdx(i); setVariant(0); setAdded(false); }}>
                    <img src={x.cut} alt="" loading="lazy" draggable="false" />
                    <b>{x.price ? fmtBDT(x.price) : "Soon"}</b>
                  </button>
                ))}
              </div>
            </div>
            {it.colors && it.colors.length > 1 && (
              <div>
                <div className="to-lbl">Colour</div>
                <div className="to-chips">
                  {it.colors.map((c, k) => <button key={c.name} className="to-chip" aria-pressed={variant === k} onClick={() => { setVariant(k); setAdded(false); }}>{c.name}</button>)}
                </div>
              </div>
            )}
            {it.remote && <div className="to-note">Shop items are shown as a plain hoodie in this colour — see the photo above for the exact design.</div>}
          </div>
          <div className="to-buy">
            <div className="to-name"><div>{it.name}</div><span>{hasPrice ? fmtBDT(it.price) : "Price coming soon"}</span></div>
            <div className="to-sizes">
              {SIZES.map(s => <button key={s} className="to-size" aria-pressed={s === size} onClick={() => { setSize(s); setAdded(false); }}>{s}</button>)}
            </div>
            <button className={"to-add" + (added ? " done" : "")} onClick={add} disabled={!hasPrice || !size}>
              {!hasPrice ? "Coming soon" : added ? "Added to cart ✓" : size ? "Add to cart" : "Choose a size"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function loadImage(file) {
  if (window.createImageBitmap) {
    return createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => viaImg(file));
  }
  return viaImg(file);
}
function viaImg(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => { res(im); setTimeout(() => URL.revokeObjectURL(url), 1000); };
    im.onerror = rej; im.src = url;
  });
}
// average brightness + colour of the person's chest area, so the 3D hoodie is lit like the photo
function photoLight(cv, lm) {
  try {
    const w = cv.width, h = cv.height;
    const xs = [lm[11].x, lm[12].x, lm[23].x, lm[24].x].map(v => v * w), ys = [lm[11].y, lm[12].y, lm[23].y, lm[24].y].map(v => v * h);
    const x0 = Math.max(0, Math.min(...xs)), x1 = Math.min(w, Math.max(...xs)), y0 = Math.max(0, Math.min(...ys)), y1 = Math.min(h, Math.max(...ys));
    const g = cv.getContext("2d");
    const pad = (x1 - x0) * 0.6;
    const X0 = Math.max(0, x0 - pad), Y0 = Math.max(0, y0 - pad), X1 = Math.min(w, x1 + pad), Y1 = Math.min(h, y1 + pad);
    const d = g.getImageData(X0, Y0, Math.max(1, X1 - X0), Math.max(1, Y1 - Y0)).data;
    let r = 0, gg = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 16) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; n++; }
    r /= n * 255; gg /= n * 255; b /= n * 255;
    const lum = 0.2126 * r + 0.7152 * gg + 0.0722 * b, m = Math.max(r, gg, b) || 1;
    return { lum, tint: [r / m, gg / m, b / m] };
  } catch { return { lum: 0.5, tint: [1, 1, 1] }; }
}

// skin colour (YCbCr chroma) sampled from the cheeks and nose
const chroma = (r, g, b) => [128 - 0.168736 * r - 0.331264 * g + 0.5 * b, 128 + 0.5 * r - 0.418688 * g - 0.081312 * b];
function skinTone(cv, lm) {
  try {
    const w = cv.width, h = cv.height, g = cv.getContext("2d");
    const pts = [[lm[0].x, lm[0].y], [(lm[0].x * 2 + lm[2].x + lm[9].x) / 4, (lm[0].y * 2 + lm[2].y + lm[9].y) / 4], [(lm[0].x * 2 + lm[5].x + lm[10].x) / 4, (lm[0].y * 2 + lm[5].y + lm[10].y) / 4]];
    const eye = Math.hypot((lm[2].x - lm[5].x) * w, (lm[2].y - lm[5].y) * h), rad = Math.max(2, Math.round(eye * 0.18));
    const cb = [], cr = [];
    pts.forEach(([x, y]) => {
      const X = Math.round(x * w) - rad, Y = Math.round(y * h) - rad;
      if (X < 0 || Y < 0 || X + 2 * rad > w || Y + 2 * rad > h) return;
      const d = g.getImageData(X, Y, 2 * rad, 2 * rad).data;
      for (let i = 0; i < d.length; i += 4) { const [b_, r_] = chroma(d[i], d[i + 1], d[i + 2]); cb.push(b_); cr.push(r_); }
    });
    if (cb.length < 20) return null;
    const med = a => a.sort((p, q) => p - q)[a.length >> 1];
    return [med(cb), med(cr)];
  } catch { return null; }
}
// person pixels near (cx, cy) whose colour matches the skin tone, as a small feathered canvas
function skinPatch(photo, mask, skin, cx, cy, r) {
  const x0 = Math.max(0, Math.floor(cx - r)), y0 = Math.max(0, Math.floor(cy - r));
  const x1 = Math.min(photo.width, Math.ceil(cx + r)), y1 = Math.min(photo.height, Math.ceil(cy + r));
  const w = x1 - x0, h = y1 - y0;
  if (w < 4 || h < 4) return null;
  const px = photo.getContext("2d").getImageData(x0, y0, w, h);
  const mc = document.createElement("canvas"); mc.width = w; mc.height = h;
  const mg = mc.getContext("2d");
  mg.drawImage(mask, 0, 0, mask.width, mask.height, -x0, -y0, photo.width, photo.height);
  const md = mg.getImageData(0, 0, w, h).data, d = px.data;
  let n = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const dist = Math.hypot(x + x0 - cx, y + y0 - cy) / r;
    const [cb, cr] = chroma(d[i], d[i + 1], d[i + 2]);
    const dc = Math.hypot(cb - skin[0], cr - skin[1]);
    let a = Math.min(1, Math.max(0, (16 - dc) / 7)) * Math.min(1, Math.max(0, (1 - dist) / 0.3)) * (md[i + 3] / 255);
    if (d[i] + d[i + 1] + d[i + 2] < 60) a = 0;          // very dark pixels are not skin
    d[i + 3] = Math.round(a * 255);
    if (a > 0.5) n++;
  }
  if (n < Math.PI * r * r * 0.06) return null;          // too little skin: probably not a visible hand
  const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
  cv.getContext("2d").putImageData(px, 0, 0);
  return { cv, x: x0, y: y0 };
}
