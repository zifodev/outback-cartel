/* eslint-disable react-hooks/immutability, react-hooks/refs, react-refresh/only-export-components */
// ─────────────────────────────────────────────────────────────
//  THE SHOWROOM — a real-time 3D flagship store (three.js / React Three Fiber)
//
//  A brushed-steel ring rail hangs on thin cables from a light cove in the
//  ceiling, over a polished concrete floor. Our hoodies hang face-out on
//  matte hangers. Each hoodie is drawn from its real product photos
//  (front, 3/4, both sides, back): as the rail turns, the photo that matches
//  the angle you are looking from is shown, blended smoothly, so the garment
//  turns like the real thing. Colours are never tone-mapped or tinted.
//
//  Tap a hoodie: it leaves its hanger and glides to you, the room dims, and
//  you can turn it 360°, zoom in, pick a size, add it to the bag, buy it, or
//  try it on a photo of yourself (the photo never leaves the device).
// ─────────────────────────────────────────────────────────────
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";

// room and rail (metres)
const RING_R = 2.2, RING_Y = 2.66, CEIL_Y = 4.25, GH = 0.84, PW = GH * 0.95;
const TAU = Math.PI * 2;
const BASE = import.meta.env.BASE_URL || "/";
const SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
const fmt = n => "৳" + Number(n).toLocaleString();
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const wrapPI = a => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const seeded = s => () => ((s = (s * 16807) % 2147483647) / 2147483647);

const NOTES = {
  meow: "Pink fleece hoodie with a peeking cat print.",
  okay: "Cartoon print hoodie, soft fleece inside.",
  tribal: "Black hoodie with a white tribal-style graphic.",
  "moon-palm": "Forest green hoodie with a golden moon and palm print.",
  "death-note": "Black hoodie with the Death Note title print.",
  "move-forward": "Soft blush hoodie with a colourful “Let's Move Forward” badge.",
  musafir: "Deep red hoodie with a “Musafir — a little passenger” print.",
  sunnah: "Navy hoodie with a gold and white “Smile is Sunnah” print.",
  butterfly: "Pink hoodie with a half-flower butterfly print.",
  kitty: "Cream hoodie with a kitty and heart print.",
  paris: "White hoodie with a navy and red Paris stripe print.",
  "meow-mustard": "Women's premium mustard hoodie with a meow cat face.",
  "meow-lavender": "Women's premium lavender hoodie with a meow cat face.",
  "plain-navy": "Premium edition plain navy hoodie.",
  "plain-grey": "Premium edition plain grey melange hoodie.",
  "plain-maroon": "Premium edition plain maroon hoodie.",
};
const PLAIN = new Set(["plain-navy", "plain-grey", "plain-maroon"]);
const FULL = new Set(["paris", "plain-maroon", "plain-grey", "plain-navy", "meow-lavender", "meow-mustard"]);
// angle you look from, relative to the hoodie's front (+ = the wearer's left)
const VIEW_ANGLE = { front: 0, threeQ: Math.PI / 4, sideL: Math.PI / 2, back: Math.PI, side: -Math.PI / 2 };
const VIEW_NAME = { front: "Front", threeQ: "3/4", sideL: "Left side", side: "Right side", back: "Back" };
export const COLLECTIONS = [["all", "All hoodies"], ["graphic", "Graphic prints"], ["plain", "Premium plain"]];

// our own hoodies (App's HOUSE_HOODIES) → showroom items with their photo views
export function buildItems(hoodies) {
  return hoodies.map(h => {
    const m = /gallery\/(.+)-front\.jpg$/.exec(h.img || "");
    if (!m) return null;
    const key = m[1];
    const v = k => `${BASE}hoodies/views/${key}-${k}.webp`;
    const views = { front: v("front"), back: v("back"), side: v("side"), sideL: v("side-l") };
    if (FULL.has(key)) views.threeQ = v("three-q");
    return {
      id: h.id, key, name: h.name, price: h.price || 0, old: h.old || 0, badge: h.badge,
      colour: (h.colors && h.colors[0]) || "", note: NOTES[key] || "", col: PLAIN.has(key) ? "plain" : "graphic",
      views, closeup: v("closeup"), img: h.img,
    };
  }).filter(Boolean);
}

// ── textures ────────────────────────────────────────────────
const loader = new THREE.TextureLoader();
const texCache = new Map();
const loadTex = url => {
  if (!texCache.has(url)) {
    texCache.set(url, new Promise((res, rej) => loader.load(url, t => {
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; res(t);
    }, undefined, rej)));
  }
  return texCache.get(url);
};
const EMPTY = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1);
EMPTY.needsUpdate = true;

function concreteCanvas(size, base, amount, seed) {
  const c = document.createElement("canvas"); c.width = c.height = size;
  const g = c.getContext("2d"), rnd = seeded(seed);
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  for (let i = 0; i < 200; i++) {
    const x = rnd() * size, y = rnd() * size, r = 12 + rnd() * 100, dark = rnd() < 0.55;
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      gr.addColorStop(0, dark ? `rgba(0,0,0,${0.06 * amount})` : `rgba(255,255,255,${0.045 * amount})`);
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    }
  }
  const img = g.getImageData(0, 0, size, size), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (rnd() - 0.5) * 22 * amount; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
  return c;
}
const canvasTex = (canvas, repeat = 1) => {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 8;
  return t;
};
function glowCanvas(inner = 0.0, outer = 1.0, color = "255,236,214") {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d"), gr = g.createRadialGradient(128, 128, 128 * inner, 128, 128, 128 * outer);
  gr.addColorStop(0, `rgba(${color},0)`); gr.addColorStop(0.5, `rgba(${color},.55)`); gr.addColorStop(1, `rgba(${color},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  return c;
}
const FONT_READY = typeof document !== "undefined" && document.fonts
  ? Promise.all([document.fonts.load('800 expanded 168px "Anek Bangla Variable"'), document.fonts.load('700 50px "Anek Bangla Variable"')]).catch(() => null)
  : Promise.resolve();
const redrawWhenFontReady = (tex, draw) => { FONT_READY.then(() => { draw(tex.image); tex.needsUpdate = true; }); return tex; };
function drawTag(c, text) {
  const g = c.getContext("2d"); g.clearRect(0, 0, c.width, c.height);
  g.fillStyle = "#F6F4EF"; g.beginPath(); g.roundRect(6, 6, 244, 100, 14); g.fill();
  g.fillStyle = "#1B1A18"; g.beginPath(); g.arc(34, 56, 9, 0, TAU); g.fill();
  g.fillStyle = "#1B1A18"; g.font = '700 50px "Anek Bangla Variable", system-ui, sans-serif'; g.textBaseline = "middle"; g.textAlign = "center";
  g.fillText(text, 146, 60);
}
function radialCanvas(stops) {
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const g = c.getContext("2d"), gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
  return c;
}
function linearCanvas(stops) {
  const c = document.createElement("canvas"); c.width = 8; c.height = 256;
  const g = c.getContext("2d"), gr = g.createLinearGradient(0, 256, 0, 0); // bottom of the texture is nearest the camera
  stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, 8, 256);
  return c;
}
function tagCanvas(text) {
  const c = document.createElement("canvas"); c.width = 256; c.height = 112; drawTag(c, text);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return redrawWhenFontReady(t, cv => drawTag(cv, text));
}
function drawSign(c, glow) {
  const g = c.getContext("2d"); g.clearRect(0, 0, c.width, c.height);
  g.font = '800 expanded 168px "Anek Bangla Variable", system-ui, sans-serif';
  try { g.fontStretch = "expanded"; } catch { /* older browsers */ }
  g.textAlign = "center"; g.textBaseline = "middle"; g.letterSpacing = "6px";
  if (glow) { g.shadowColor = "rgba(255,232,205,1)"; g.shadowBlur = 60; g.fillStyle = "rgba(255,236,214,.9)"; }
  else g.fillStyle = "#FFFAF2";
  g.fillText("OUTBACK CARTEL", 1024, 160);
}
function signCanvas(glow) {
  const c = document.createElement("canvas"); c.width = 2048; c.height = 300; drawSign(c, glow);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return redrawWhenFontReady(t, cv => drawSign(cv, glow));
}

// ── the garment material: two photo views blended, aspect kept, colours untouched ──
const GARMENT_VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const GARMENT_FRAG = `
uniform sampler2D mapA; uniform sampler2D mapB; uniform float aspA; uniform float aspB; uniform float mixT;
uniform float light; uniform float alpha; uniform float planeAsp; uniform float hi;
varying vec2 vUv;
vec4 samp(sampler2D m, float asp){
  float x = (vUv.x - 0.5) * planeAsp / asp + 0.5;
  if (x < 0.0 || x > 1.0) return vec4(0.0);
  return texture2D(m, vec2(x, vUv.y));
}
void main(){
  vec4 a = samp(mapA, aspA); vec4 b = samp(mapB, aspB);
  float al = mix(a.a, b.a, mixT);
  if (al < 0.02) discard;
  vec3 rgb = mix(a.rgb * a.a, b.rgb * b.a, mixT) / max(al, 1e-4);
  float shade = mix(0.86, 1.0, smoothstep(0.0, 0.8, vUv.y));
  rgb = rgb * shade * light + vec3(hi * 0.05);
  gl_FragColor = vec4(rgb, al * alpha);
  #include <colorspace_fragment>
}`;
const makeGarmentMat = () => new THREE.ShaderMaterial({
  vertexShader: GARMENT_VERT, fragmentShader: GARMENT_FRAG, transparent: true, depthWrite: true, side: THREE.DoubleSide,
  uniforms: { mapA: { value: EMPTY }, mapB: { value: EMPTY }, aspA: { value: 0.8 }, aspB: { value: 0.8 }, mixT: { value: 0 }, light: { value: 0 }, alpha: { value: 1 }, planeAsp: { value: PW / GH }, hi: { value: 0 } },
});

// pick the two photos either side of the viewing angle and how far between them we are
function viewBlend(phi, tex) {
  const anchors = [["back", -Math.PI], ["side", -Math.PI / 2], ["front", 0]];
  if (tex.threeQ) anchors.push(["threeQ", Math.PI / 4]);
  anchors.push(["sideL", Math.PI / 2], ["back", Math.PI]);
  for (let k = 0; k < anchors.length - 1; k++) {
    const [na, a0] = anchors[k], [nb, a1] = anchors[k + 1];
    if (phi >= a0 && phi <= a1) {
      let t = (phi - a0) / (a1 - a0);
      t = t * t * (3 - 2 * t);                 // ease the cross-fade
      t = clamp((t - 0.32) / 0.36, 0, 1);       // hold each photo, then switch quickly
      return [tex[na] || tex.front, tex[nb] || tex.front, t, t < 0.5 ? na : nb];
    }
  }
  return [tex.front, tex.front, 0, "front"];
}

// ── the room ────────────────────────────────────────────────
function Room({ reveal }) {
  const tex = useMemo(() => {
    const floor = canvasTex(concreteCanvas(512, "#8a857e", 1, 11), 7);
    const wall = canvasTex(concreteCanvas(512, "#7a746d", 0.8, 23), 3);
    const glow = new THREE.CanvasTexture(glowCanvas(0.62, 1.0)); glow.colorSpace = THREE.SRGBColorSpace;
    const pool = new THREE.CanvasTexture(radialCanvas([[0, "rgba(255,214,170,.55)"], [0.45, "rgba(255,214,170,.18)"], [1, "rgba(255,214,170,0)"]])); pool.colorSpace = THREE.SRGBColorSpace;
    const shadow = new THREE.CanvasTexture(radialCanvas([[0.42, "rgba(10,8,6,0)"], [0.66, "rgba(10,8,6,.42)"], [0.92, "rgba(10,8,6,0)"]])); shadow.colorSpace = THREE.SRGBColorSpace;
    const sheen = new THREE.CanvasTexture(linearCanvas([[0, "rgba(255,226,196,0)"], [0.55, "rgba(255,226,196,.10)"], [0.93, "rgba(255,226,196,.34)"], [1, "rgba(255,240,225,.6)"]])); sheen.colorSpace = THREE.SRGBColorSpace;
    const sign = signCanvas(false), signGlow = signCanvas(true);
    return { floor, wall, glow, sign, signGlow, pool, shadow, sheen };
  }, []);
  const signMat = useRef(), glowMat = useRef(), coveMat = useRef(), floorStrip = useRef();
  const slotMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#fff", toneMapped: false }), []);
  useFrame(() => {
    const r = reveal.current;
    const sign = clamp((r.t - 2.0) / 0.9, 0, 1);
    if (signMat.current) signMat.current.opacity = sign;
    if (glowMat.current) glowMat.current.opacity = sign * 0.55 * r.room;
    const cove = clamp((r.t - 0.5) / 1.2, 0, 1) * r.room;
    if (coveMat.current) coveMat.current.color.setScalar(0.12 + 0.95 * cove);
    const slot = clamp((r.t - 1.1) / 1.2, 0, 1) * r.room;
    slotMat.color.setScalar(0.08 + 0.7 * slot);
    if (floorStrip.current) floorStrip.current.color.setScalar(0.06 + 0.5 * slot);
  });
  const glassMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#a9b8bf", metalness: 0.9, roughness: 0.06, transparent: true, opacity: 0.12, envMapIntensity: 1.6 }), []);
  const steel = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c7cacd", metalness: 1, roughness: 0.32 }), []);
  return (
    <group>
      {/* polished concrete floor: glossy enough to pick up the ceiling lights (via the environment) */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial map={tex.floor} color="#3d3934" roughness={0.62} metalness={0} envMapIntensity={0.4} />
      </mesh>
      {/* light on the floor: a warm pool under the rail, the hoodies' soft shadow, and the lit wall's sheen */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.003, 0.5]} renderOrder={-1}><planeGeometry args={[9, 9]} /><meshBasicMaterial map={tex.pool} transparent opacity={0.16} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.004, 0]} renderOrder={-1}><planeGeometry args={[RING_R * 3, RING_R * 3]} /><meshBasicMaterial map={tex.shadow} transparent opacity={0.55} depthWrite={false} /></mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.005, -4.1]} renderOrder={-1}><planeGeometry args={[26, 3]} /><meshBasicMaterial map={tex.sheen} transparent opacity={0.32} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh>
      {/* back wall, side walls, ceiling */}
      <mesh position={[0, CEIL_Y / 2, -5.6]} receiveShadow><planeGeometry args={[26, CEIL_Y]} /><meshStandardMaterial map={tex.wall} color="#a89f95" roughness={0.94} /></mesh>
      <mesh position={[-8, CEIL_Y / 2, 2]} rotation-y={Math.PI / 2}><planeGeometry args={[24, CEIL_Y]} /><meshStandardMaterial map={tex.wall} color="#8a837b" roughness={0.96} /></mesh>
      <mesh position={[8, CEIL_Y / 2, 2]} rotation-y={-Math.PI / 2}><planeGeometry args={[24, CEIL_Y]} /><meshStandardMaterial map={tex.wall} color="#8a837b" roughness={0.96} /></mesh>
      <mesh position={[0, CEIL_Y, 2]} rotation-x={Math.PI / 2}><planeGeometry args={[26, 24]} /><meshStandardMaterial map={tex.wall} color="#3a3733" roughness={0.9} /></mesh>
      {/* recessed light slots in the ceiling, and a light strip where the back wall meets the floor */}
      {[-3.4, 3.4].map(x => <mesh key={x} position={[x, CEIL_Y - 0.01, 1]} rotation-x={Math.PI / 2} material={slotMat}><planeGeometry args={[0.07, 12]} /></mesh>)}
      <mesh position={[0, 0.015, -5.58]}><planeGeometry args={[26, 0.025]} /><meshBasicMaterial ref={floorStrip} color="#fff" toneMapped={false} /></mesh>
      {/* the light cove the rail hangs from */}
      <mesh position={[0, CEIL_Y - 0.02, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[RING_R, 0.022, 10, 160]} /><meshBasicMaterial ref={coveMat} color="#fff" toneMapped={false} /></mesh>
      <mesh position={[0, CEIL_Y - 0.04, 0]} rotation-x={Math.PI / 2}><planeGeometry args={[RING_R * 2.8, RING_R * 2.8]} /><meshBasicMaterial map={tex.glow} transparent opacity={0.32} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh>
      {/* backlit sign on the back wall */}
      <mesh position={[0, 3.9, -5.55]}><planeGeometry args={[4.4, 0.64]} /><meshBasicMaterial ref={glowMat} map={tex.signGlow} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh>
      <mesh position={[0, 3.9, -5.54]}><planeGeometry args={[4.4, 0.64]} /><meshBasicMaterial ref={signMat} map={tex.sign} transparent opacity={0} toneMapped={false} /></mesh>
      {/* glass partitions with steel frames, either side of the rail */}
      {[-1, 1].map(s => (
        <group key={s} position={[s * 5.5, 0, -0.4]} rotation-y={s * -0.22}>
          <mesh position={[0, CEIL_Y / 2, 0]} material={glassMat}><planeGeometry args={[3.2, CEIL_Y]} /></mesh>
          {[-1.6, 0, 1.6].map(x => <mesh key={x} position={[x, CEIL_Y / 2, 0]} material={steel}><boxGeometry args={[0.035, CEIL_Y, 0.035]} /></mesh>)}
          <mesh position={[0, 0.03, 0]} material={steel}><boxGeometry args={[3.2, 0.06, 0.05]} /></mesh>
        </group>
      ))}
    </group>
  );
}

// ── lights, faded up one by one on entry ──
function Lights({ mobile, reveal }) {
  const refs = useRef([]);
  const spots = useMemo(() => [
    // [position, target, intensity, delay, castShadow]
    [[0, CEIL_Y - 0.1, 3.6], [0, 2.25, 2.0], 90, 0.3, true],
    [[-2.3, CEIL_Y - 0.1, 2.8], [-1.5, 2.25, 1.4], 70, 0.5, false],
    [[2.3, CEIL_Y - 0.1, 2.8], [1.5, 2.25, 1.4], 70, 0.7, false],
    [[0, CEIL_Y - 0.1, -3.0], [0, 1.9, -1.6], 40, 0.9, false],
    // wall washers along the back wall, plus the plinths
    [[-4.5, CEIL_Y - 0.1, -4.9], [-4.5, 0.3, -5.6], 120, 1.2, false],
    [[-1.5, CEIL_Y - 0.1, -4.9], [-1.5, 0.3, -5.6], 120, 1.35, false],
    [[1.5, CEIL_Y - 0.1, -4.9], [1.5, 0.3, -5.6], 120, 1.5, false],
    [[4.5, CEIL_Y - 0.1, -4.9], [4.5, 0.3, -5.6], 120, 1.65, false],
  ], []);
  const targets = useMemo(() => spots.map(([, t]) => { const o = new THREE.Object3D(); o.position.set(...t); return o; }), [spots]);
  const hemi = useRef(), amb = useRef();
  useFrame(() => {
    const r = reveal.current;
    spots.forEach(([, , base, delay], i) => {
      const l = refs.current[i]; if (!l) return;
      const k = clamp((r.t - delay) / 0.8, 0, 1);
      l.intensity = base * k * k * r.room;
    });
    const k = clamp(r.t / 1.6, 0, 1);
    if (hemi.current) hemi.current.intensity = 0.35 * k * (0.55 + 0.45 * r.room);
    if (amb.current) amb.current.intensity = 0.08 + 0.1 * k;
  });
  return (
    <>
      <ambientLight ref={amb} intensity={0.12} color="#fff4e8" />
      <hemisphereLight ref={hemi} args={["#fff2e2", "#2b2724", 0]} />
      {spots.map(([p, , , , shadow], i) => (
        <spotLight key={i} ref={el => (refs.current[i] = el)} position={p} target={targets[i]} intensity={0} color="#ffe6c8"
          angle={i < 4 ? 0.42 : 0.5} penumbra={i < 4 ? 0.9 : 0.6} distance={14} decay={2}
          castShadow={shadow && !mobile} shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
      ))}
      {targets.map((t, i) => <primitive key={i} object={t} />)}
    </>
  );
}

// ── the rail, the hangers and the hoodies ──
function Rail({ items, ctl, mobile, reveal, onFront, onPick, onView }) {
  const { camera } = useThree();
  const ring = useRef(), dim = useRef();
  const garments = useRef([]), hangers = useRef([]), tags = useRef([]);
  const geo = useMemo(() => {
    const shoulder = new THREE.CatmullRomCurve3([[-0.21, -0.1, 0], [-0.11, -0.05, 0], [0, -0.032, 0], [0.11, -0.05, 0], [0.21, -0.1, 0]].map(p => new THREE.Vector3(...p)));
    const plane = new THREE.PlaneGeometry(PW, GH); plane.translate(0, -GH / 2, 0);
    const tag = new THREE.PlaneGeometry(0.12, 0.0525); tag.translate(0, -0.026, 0);
    return {
      hanger: new THREE.TubeGeometry(shoulder, 28, 0.0075, 6, false),
      hook: new THREE.TorusGeometry(0.026, 0.0032, 6, 20, Math.PI * 1.3),
      neck: new THREE.CylinderGeometry(0.003, 0.003, 0.05, 6),
      plane, tag,
    };
  }, []);
  const mats = useMemo(() => ({
    steel: new THREE.MeshStandardMaterial({ color: "#d0d3d6", metalness: 1, roughness: 0.26 }),
    hanger: new THREE.MeshStandardMaterial({ color: "#232220", metalness: 0.55, roughness: 0.42 }),
    chrome: new THREE.MeshStandardMaterial({ color: "#e6e7e8", metalness: 1, roughness: 0.18 }),
    cable: new THREE.MeshStandardMaterial({ color: "#9a9da0", metalness: 1, roughness: 0.4 }),
  }), []);
  const gm = useMemo(() => items.map(() => makeGarmentMat()), [items]);
  const tagMats = useMemo(() => items.map(it => new THREE.MeshBasicMaterial({ map: tagCanvas(it.price > 0 ? fmt(it.price) : "Soon"), transparent: true, toneMapped: false, side: THREE.DoubleSide })), [items]);
  // per-hoodie mutable state
  const st = useRef(null);
  if (!st.current) st.current = items.map((_, i) => ({ ang: (i / items.length) * TAU, tAng: (i / items.length) * TAU, lift: 0, tLift: 0, pop: 0, turn: 0, swing: 0, swingV: 0, hi: 0, tex: null, view: "front", seen: 1 }));
  // load the photos: fronts first, then the other views
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const fronts = await Promise.all(items.map(it => loadTex(it.views.front)));
        if (!alive) return;
        fronts.forEach((t, i) => { st.current[i].tex = { front: t }; });
        ctl.current.ready();
        for (const [i, it] of items.entries()) {
          const keys = Object.keys(it.views).filter(k => k !== "front");
          const loaded = await Promise.all(keys.map(k => loadTex(it.views[k]).catch(() => null)));
          if (!alive) return;
          keys.forEach((k, j) => { if (loaded[j]) st.current[i].tex[k] = loaded[j]; });
        }
      } catch (e) { ctl.current.fail(e); }
    })();
    return () => { alive = false; };
  }, [items, ctl]);

  const tmp = useMemo(() => ({ fwd: new THREE.Vector3(), right: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), p: new THREE.Vector3(), q: new THREE.Vector3(), r: new THREE.Vector3(), c: new THREE.Vector3() }), []);
  const lastFront = useRef(-1), lastView = useRef("");

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05), c = ctl.current, S = st.current;
    // which hoodies are on the rail for the chosen collection
    const active = items.map(it => c.col === "all" || it.col === c.col);
    const nAct = active.filter(Boolean).length || 1;
    let k = 0;
    items.forEach((it, i) => {
      if (active[i]) { S[i].tAng = (k / nAct) * TAU; S[i].tLift = 0; k++; } else S[i].tLift = 2.3;
    });
    // spin: user drag, inertia, gentle auto-rotate when idle
    if (!c.drag) {
      const idle = c.sel < 0 && c.hover < 0 && !c.reduced ? 0.07 : 0;
      c.vel = damp(c.vel, idle, c.sel >= 0 ? 6 : 0.9, dt);
      if (c.snap != null && c.sel < 0) { // arrow buttons: glide to the next hoodie
        const diff = wrapPI(c.snap - c.ring); c.ring += diff * (1 - Math.exp(-5 * dt)); if (Math.abs(diff) < 0.002) c.snap = null;
      } else c.ring += c.vel * dt;
    }
    if (ring.current) ring.current.rotation.y = c.ring;
    // camera direction from the ring's centre (for "which hoodie is in front")
    const camAng = Math.atan2(camera.position.x, camera.position.z);
    camera.getWorldDirection(tmp.fwd); tmp.right.crossVectors(tmp.fwd, tmp.up).normalize();
    // where a picked hoodie is presented: in front of the camera, left of the product panel on desktop
    const zoom = c.zoomV = damp(c.zoomV || 0, c.zoom ? 1 : 0, 5, dt);
    const dist = THREE.MathUtils.lerp(mobile ? 2.45 : 2.15, mobile ? 1.45 : 1.2, zoom);
    tmp.p.copy(camera.position).addScaledVector(tmp.fwd, dist)
      .addScaledVector(tmp.right, mobile ? 0 : THREE.MathUtils.lerp(-0.5, -0.3, zoom))
      .addScaledVector(tmp.up, THREE.MathUtils.lerp(GH * 0.5 + (mobile ? 0.3 : 0.02), GH * 0.36 + (mobile ? 0.17 : 0), zoom));
    // presented hoodie yaw: drag to turn, buttons to jump, eased
    if (!c.drag) c.yaw = damp(c.yaw, c.yawT, 6, dt);
    c.dimV = damp(c.dimV || 0, c.sel >= 0 ? 1 : 0, 4, dt);
    reveal.current.room = 1 - 0.5 * c.dimV;
    if (dim.current) {
      dim.current.position.copy(camera.position).addScaledVector(tmp.fwd, dist + 0.6);
      dim.current.quaternion.copy(camera.quaternion);
      dim.current.material.opacity = c.dimV * 0.5;
      dim.current.visible = c.dimV > 0.01;
    }
    let best = -1, bestDot = -2;
    const rev = clamp((reveal.current.t - 0.6) / 1.6, 0, 1);
    items.forEach((it, i) => {
      const s = S[i], g = garments.current[i], h = hangers.current[i], tg = tags.current[i];
      if (!g || !h) return;
      s.ang = damp(s.ang, s.tAng, 3.2, dt);
      s.lift = damp(s.lift, s.tLift, s.tLift > s.lift ? 2.2 : 3, dt);
      const a = c.ring + s.ang;
      const sx = Math.sin(a), sz = Math.cos(a);
      const front = Math.cos(wrapPI(a - camAng));
      if (active[i] && i !== c.sel && front > bestDot) { bestDot = front; best = i; }
      // the hanger rides on the ring, face-out; it swings a little after a hoodie leaves it
      s.swingV += (-s.swing * 40 - s.swingV * 3.2) * dt; s.swing += s.swingV * dt;
      h.position.set(sx * RING_R, RING_Y + s.lift, sz * RING_R);
      h.rotation.set(s.swing, a, -c.vel * 0.06);
      // the hoodie: on its hanger, or travelling to / sitting in front of the camera
      const picked = i === c.sel;
      s.pop = damp(s.pop, picked ? 1 : 0, picked ? 3.4 : 4, dt);
      const e = ease(clamp(s.pop, 0, 1));
      tmp.q.set(sx * RING_R, RING_Y - 0.03 + s.lift + Math.sin(state.clock.elapsedTime * 0.9 + i) * 0.004, sz * RING_R);
      tmp.c.copy(camera.position).sub(tmp.q).setY(0).normalize();
      tmp.q.addScaledVector(tmp.c, 0.04);                    // the hanger sits inside the hoodie, just behind the photo
      g.position.lerpVectors(tmp.q, tmp.p, e);
      g.position.y += Math.sin(e * Math.PI) * 0.22;        // lifts off the hook on its way out
      g.renderOrder = picked ? 10 : 0;
      // hover: the hoodie turns towards you a little, like pulling it out of the rail
      s.turn = damp(s.turn, c.hover === i && c.sel < 0 ? 1 : 0, 6, dt);
      s.hi = damp(s.hi, c.hover === i && c.sel < 0 ? 1 : 0, 8, dt);
      tmp.r.copy(camera.position).sub(g.position);
      const toCam = Math.atan2(tmp.r.x, tmp.r.z);
      let facing = a + wrapPI(toCam - a) * s.turn * 0.85;
      if (e > 0.001) facing += wrapPI(toCam - c.yaw - facing) * e;
      const phi = wrapPI(toCam - facing);
      g.rotation.set(0, toCam, picked ? 0 : -c.vel * 0.05 + Math.sin(state.clock.elapsedTime * 0.7 + i * 1.7) * 0.006);
      g.scale.setScalar(1 + s.hi * 0.03);
      g.scale.x *= 1 - 0.09 * Math.sin(Math.PI * gm[i].uniforms.mixT.value);   // a garment narrows as it turns
      const m = gm[i].uniforms;
      if (s.tex) {
        const [A, B, t, nearest] = viewBlend(phi, s.tex);
        m.mapA.value = A; m.mapB.value = B; m.mixT.value = t;
        m.aspA.value = A.image ? A.image.width / A.image.height : 0.8; m.aspB.value = B.image ? B.image.width / B.image.height : 0.8;
        s.view = nearest;
      }
      // light: hoodies at the front of the rail sit in the spotlights, the back ones in shade
      const lit = THREE.MathUtils.lerp(0.26, 1.0, clamp((front + 0.2) / 1.1, 0, 1));
      const shade = picked ? 1 : 1 - 0.55 * c.dimV;
      m.light.value = THREE.MathUtils.lerp(lit, 1.0, e) * shade * rev;
      m.alpha.value = clamp(1 - (s.lift - 0.6) / 1.2, 0, 1);
      m.hi.value = s.hi;
      g.visible = m.alpha.value > 0.01;
      h.visible = s.lift < 2.0;
      if (tg) {
        tg.position.set(h.position.x + Math.cos(a) * 0.07 + tmp.c.x * 0.07, RING_Y + s.lift - 0.012, h.position.z - Math.sin(a) * 0.07 + tmp.c.z * 0.07);
        tg.rotation.set(0, toCam, 0.18);
        tg.visible = h.visible && s.pop < 0.05 && front > -0.2;
        tagMats[i].opacity = clamp((front + 0.2) * 3, 0, 1) * rev;
      }
    });
    if (best !== lastFront.current) { lastFront.current = best; onFront(best); }
    if (c.sel >= 0) {
      const v = S[c.sel].view;
      if (v !== lastView.current) { lastView.current = v; onView(v); }
    } else lastView.current = "";
  });

  const kick = useCallback(i => { st.current[i].swingV += 2.4; }, []);
  useEffect(() => { ctl.current.kick = kick; }, [ctl, kick]);

  return (
    <group>
      {/* the ring and its cables turn together */}
      <group ref={ring}>
        <mesh position={[0, RING_Y, 0]} rotation-x={Math.PI / 2} material={mats.steel} castShadow><torusGeometry args={[RING_R, 0.017, 14, 180]} /></mesh>
        {[0.25, 0.75, 1.25, 1.75].map(f => (
          <mesh key={f} position={[Math.sin(f * Math.PI) * RING_R, (RING_Y + CEIL_Y) / 2, Math.cos(f * Math.PI) * RING_R]} material={mats.cable}>
            <cylinderGeometry args={[0.0028, 0.0028, CEIL_Y - RING_Y, 6]} />
          </mesh>
        ))}
      </group>
      {items.map((it, i) => (
        <group key={it.id} ref={el => (hangers.current[i] = el)}>
          <mesh geometry={geo.hook} material={mats.chrome} position={[0, 0.006, 0]} rotation={[0, Math.PI / 2, -0.7]} />
          <mesh geometry={geo.neck} material={mats.chrome} position={[0, -0.04, 0]} />
          <mesh geometry={geo.hanger} material={mats.hanger} position={[0, -0.03, 0]} castShadow />
        </group>
      ))}
      {items.map((it, i) => (
        <mesh key={it.id} ref={el => (garments.current[i] = el)} geometry={geo.plane} material={gm[i]}
          onPointerOver={e => { e.stopPropagation(); ctl.current.hover = i; document.body.style.cursor = "pointer"; }}
          onPointerOut={() => { if (ctl.current.hover === i) ctl.current.hover = -1; document.body.style.cursor = ""; }}
          onClick={e => { e.stopPropagation(); if (e.delta > 8) return; onPick(i); }} />
      ))}
      {items.map((it, i) => <mesh key={it.id} ref={el => (tags.current[i] = el)} geometry={geo.tag} material={tagMats[i]} />)}
      {/* dims the room behind a picked hoodie */}
      <mesh ref={dim} renderOrder={5} visible={false}><planeGeometry args={[30, 30]} /><meshBasicMaterial color="#0b0a09" transparent opacity={0} depthWrite={false} depthTest={false} /></mesh>
    </group>
  );
}

// ── camera: arrives from the street, closes in as you scroll, follows the pointer a little ──
function CameraRig({ ctl, mobile, reveal }) {
  const { camera } = useThree();
  const look = useRef(new THREE.Vector3(0, 2.2, 0)), want = useRef(new THREE.Vector3());
  useEffect(() => { camera.fov = mobile ? 44 : 40; camera.updateProjectionMatrix(); }, [camera, mobile]);
  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05), c = ctl.current;
    reveal.current.t += dt * (c.reduced ? 20 : 1);
    const intro = ease(clamp(reveal.current.t / 3.2, 0, 1));
    const p = c.scroll;
    const z0 = mobile ? 12 : 11.5, z1 = mobile ? 5.6 : 5.9, z2 = mobile ? 4.8 : 4.5;
    const z = THREE.MathUtils.lerp(THREE.MathUtils.lerp(z0, z1, intro), z2, p * intro);
    const y = THREE.MathUtils.lerp(2.5, mobile ? 1.72 : 1.55, intro) - p * 0.03;
    const free = c.sel < 0 ? 1 : 0.25;
    want.current.set(c.px * (mobile ? 0 : 0.5) * free, y + c.py * (mobile ? 0 : 0.12) * free, z);
    camera.position.lerp(want.current, 1 - Math.exp(-3.2 * dt));
    look.current.lerp(new THREE.Vector3(0, THREE.MathUtils.lerp(2.1, mobile ? 1.98 : 1.66, intro) - p * 0.02, 0), 1 - Math.exp(-3 * dt));
    camera.lookAt(look.current);
  });
  return null;
}

// ── fitting room: put the hoodie over your own photo (stays on the device) ──
function FittingRoom({ item, onClose }) {
  const [photo, setPhoto] = useState(null);
  const [pos, setPos] = useState({ x: 50, y: 56, s: 62, r: 0 });
  const stageRef = useRef(), drag = useRef(null), fileRef = useRef();
  const garment = item.views.front;
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo); }, [photo]);
  const pick = e => { const f = e.target.files && e.target.files[0]; if (f) setPhoto(URL.createObjectURL(f)); };
  const down = e => { e.preventDefault(); drag.current = { x: e.clientX, y: e.clientY, p: { ...pos } }; e.currentTarget.setPointerCapture(e.pointerId); };
  const move = e => {
    if (!drag.current) return;
    const r = stageRef.current.getBoundingClientRect();
    setPos(p => ({ ...p, x: clamp(drag.current.p.x + ((e.clientX - drag.current.x) / r.width) * 100, 0, 100), y: clamp(drag.current.p.y + ((e.clientY - drag.current.y) / r.height) * 100, 0, 100) }));
  };
  const up = () => { drag.current = null; };
  const save = async () => {
    const W = 1080, Hh = 1440, cv = document.createElement("canvas"); cv.width = W; cv.height = Hh;
    const g = cv.getContext("2d");
    const load = src => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
    if (photo) {
      const im = await load(photo), sc = Math.max(W / im.width, Hh / im.height);
      g.drawImage(im, (W - im.width * sc) / 2, (Hh - im.height * sc) / 2, im.width * sc, im.height * sc);
    } else { drawMannequin(g, W, Hh); }
    const gi = await load(garment), gw = (pos.s / 100) * W, gh = gw * (gi.height / gi.width);
    g.save(); g.translate((pos.x / 100) * W, (pos.y / 100) * Hh); g.rotate((pos.r * Math.PI) / 180); g.drawImage(gi, -gw / 2, -gh / 2, gw, gh); g.restore();
    g.fillStyle = "rgba(0,0,0,.55)"; g.fillRect(0, Hh - 70, W, 70);
    g.fillStyle = "#fff"; g.font = '700 30px "Anek Bangla Variable", system-ui'; g.fillText(`${item.name} · Outback Cartel`, 32, Hh - 25);
    cv.toBlob(b => { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `outback-cartel-${item.key}.jpg`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }, "image/jpeg", 0.92);
  };
  const mannequin = useMemo(() => { const c = document.createElement("canvas"); c.width = 540; c.height = 720; drawMannequin(c.getContext("2d"), 540, 720); return c.toDataURL(); }, []);
  return (
    <div className="sr-fit" role="dialog" aria-modal="true" aria-label="Try it on">
      <div className="sr-fit-box">
        <div className="sr-fit-head">
          <div><b>Try it on</b><span>{item.name}</span></div>
          <button className="sr-x" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="sr-fit-stage" ref={stageRef}>
          <img className="sr-fit-bg" src={photo || mannequin} alt={photo ? "Your photo" : "Mannequin"} />
          <img className="sr-fit-g" src={garment} alt={item.name} draggable="false" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
            style={{ left: `${pos.x}%`, top: `${pos.y}%`, width: `${pos.s}%`, transform: `translate(-50%,-50%) rotate(${pos.r}deg)` }} />
        </div>
        <div className="sr-fit-ctl">
          <label>Size on photo<input type="range" min="25" max="110" value={pos.s} onChange={e => setPos(p => ({ ...p, s: +e.target.value }))} /></label>
          <label>Tilt<input type="range" min="-20" max="20" value={pos.r} onChange={e => setPos(p => ({ ...p, r: +e.target.value }))} /></label>
        </div>
        <div className="sr-fit-acts">
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={pick} />
          <button className="sr-btn sr-btn-dark" onClick={() => fileRef.current.click()}>{photo ? "Use another photo" : "Use my photo"}</button>
          {photo && <button className="sr-btn sr-btn-ghost" onClick={() => setPhoto(null)}>Use the mannequin</button>}
          <button className="sr-btn sr-btn-ghost" onClick={save}>Save picture</button>
        </div>
        <p className="sr-fit-note">Drag the hoodie onto your shoulders. This is a quick preview, not a fit guarantee — pick your size from the size chart. Your photo stays on this device and is never uploaded.</p>
      </div>
    </div>
  );
}
function drawMannequin(g, W, H) {
  const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#E9E6E1"); bg.addColorStop(1, "#CFCAC3");
  g.fillStyle = bg; g.fillRect(0, 0, W, H);
  g.fillStyle = "#B9B3AB";
  const cx = W / 2, u = W / 540;
  g.beginPath(); g.ellipse(cx, 150 * u, 58 * u, 72 * u, 0, 0, TAU); g.fill();                 // head
  g.fillRect(cx - 24 * u, 210 * u, 48 * u, 50 * u);                                           // neck
  g.beginPath(); g.moveTo(cx - 175 * u, 300 * u); g.quadraticCurveTo(cx - 170 * u, 250 * u, cx - 60 * u, 248 * u);
  g.lineTo(cx + 60 * u, 248 * u); g.quadraticCurveTo(cx + 170 * u, 250 * u, cx + 175 * u, 300 * u);
  g.lineTo(cx + 150 * u, H); g.lineTo(cx - 150 * u, H); g.closePath(); g.fill();               // shoulders and body
}

// ── the whole section: 3D stage + controls + product panel ──
export default function Showroom({ hoodies, onAdd, onBuyNow, onDetails, onShopAll, onFail }) {
  const items = useMemo(() => buildItems(hoodies), [hoodies]);
  const [mobile, setMobile] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches);
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [ready, setReady] = useState(false);
  const [sel, setSel] = useState(-1);
  const [front, setFront] = useState(0);
  const [col, setCol] = useState("all");
  const [view, setView] = useState("front");
  const [zoom, setZoom] = useState(false);
  const [size, setSize] = useState(null);
  const [added, setAdded] = useState(false);
  const [closeup, setCloseup] = useState(false);
  const [fit, setFit] = useState(false);
  const [touched, setTouched] = useState(false);
  const [onScreen, setOnScreen] = useState(true);
  const wrap = useRef(), stage = useRef(), addBtn = useRef();
  const reveal = useRef({ t: 0, room: 1 });
  const ctl = useRef(null);
  if (!ctl.current) ctl.current = { sel: -1, ring: 0, vel: 0, yaw: 0, yawT: 0, zoom: false, col: "all", hover: -1, drag: null, scroll: 0, px: 0, py: 0, snap: null, reduced, ready: () => {}, fail: () => {}, kick: () => {} };
  useEffect(() => {
    ctl.current.ready = () => setReady(true);
    ctl.current.fail = e => { console.error("Showroom failed", e); if (onFail) onFail(); };
  }, [onFail]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)"), f = () => setMobile(mq.matches);
    mq.addEventListener("change", f); return () => mq.removeEventListener("change", f);
  }, []);
  // scroll progress through the section drives the camera in
  useEffect(() => {
    const f = () => {
      const el = wrap.current; if (!el) return;
      const r = el.getBoundingClientRect(), span = r.height - window.innerHeight;
      ctl.current.scroll = span > 0 ? clamp(-r.top / span, 0, 1) : clamp(-r.top / window.innerHeight, 0, 1) * 0.5;
    };
    f(); window.addEventListener("scroll", f, { passive: true }); window.addEventListener("resize", f);
    return () => { window.removeEventListener("scroll", f); window.removeEventListener("resize", f); };
  }, []);
  // stop rendering when the showroom is off screen
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { rootMargin: "120px" });
    if (wrap.current) io.observe(wrap.current);
    return () => io.disconnect();
  }, []);

  const pick = useCallback(i => {
    if (i < 0 || i >= items.length) return;
    const c = ctl.current;
    if (c.sel >= 0 && c.sel !== i) c.kick(c.sel);
    c.sel = i; c.yaw = 0; c.yawT = 0; c.zoom = false; c.hover = -1; c.kick(i);
    document.body.style.cursor = "";
    setSel(i); setView("front"); setZoom(false); setSize(null); setAdded(false); setCloseup(false); setTouched(true);
  }, [items.length]);
  const close = useCallback(() => { const c = ctl.current; if (c.sel >= 0) c.kick(c.sel); c.sel = -1; c.zoom = false; setSel(-1); setFit(false); setCloseup(false); }, []);
  const turnRail = dir => {
    const c = ctl.current, act = items.filter(it => col === "all" || it.col === col).length || 1;
    const step = TAU / act; c.vel = 0;
    c.snap = Math.round(((c.snap ?? c.ring) - dir * step) / step) * step; setTouched(true);
  };
  const setViewTo = v => { ctl.current.yawT = VIEW_ANGLE[v]; ctl.current.yaw = wrapPI(ctl.current.yaw); setCloseup(false); };
  const chooseCol = k => { ctl.current.col = k; ctl.current.vel += 1.6; setCol(k); close(); };

  // drag anywhere on the stage: turn the rail, or turn the picked hoodie
  useEffect(() => {
    const el = stage.current; if (!el) return;
    const down = e => { if (e.button > 0) return; ctl.current.drag = { x: e.clientX, last: e.clientX, t: performance.now(), moved: 0 }; };
    const move = e => {
      const c = ctl.current, r = el.getBoundingClientRect();
      if (!mobile) { c.px = ((e.clientX - r.left) / r.width - 0.5) * 2; c.py = -((e.clientY - r.top) / r.height - 0.5) * 2; }
      const d = c.drag; if (!d) return;
      const now = performance.now(), dx = e.clientX - d.last, dtm = Math.max(1, now - d.t);
      d.last = e.clientX; d.t = now; d.moved += Math.abs(dx);
      if (d.moved > 4) setTouched(true);
      if (c.sel >= 0) { c.yaw += dx * 0.011; c.yawT = c.yaw; }
      else { c.snap = null; c.ring += dx * 0.0045; c.vel = (dx * 0.0045) / (dtm / 1000) * 0.6; }
    };
    const up = () => { ctl.current.drag = null; };
    el.addEventListener("pointerdown", down); window.addEventListener("pointermove", move, { passive: true }); window.addEventListener("pointerup", up); window.addEventListener("pointercancel", up);
    return () => { el.removeEventListener("pointerdown", down); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); window.removeEventListener("pointercancel", up); };
  }, [mobile]);
  // keyboard: arrows turn, Enter takes the front hoodie, Escape puts it back
  const onKey = e => {
    if (e.key === "ArrowLeft") { e.preventDefault(); sel >= 0 ? (ctl.current.yawT -= Math.PI / 4) : turnRail(-1); }
    else if (e.key === "ArrowRight") { e.preventDefault(); sel >= 0 ? (ctl.current.yawT += Math.PI / 4) : turnRail(1); }
    else if (e.key === "Enter" && sel < 0 && front >= 0) { e.preventDefault(); pick(front); }
    else if (e.key === "Escape" && sel >= 0) { e.preventDefault(); close(); }
  };

  // hide the floating chat button on phones while a hoodie's panel is open
  useEffect(() => { document.body.classList.toggle("sr-open", sel >= 0); return () => document.body.classList.remove("sr-open"); }, [sel]);
  const it = sel >= 0 ? items[sel] : null;
  const fr = front >= 0 ? items[front] : null;
  const priced = it && it.price > 0;
  const add = () => {
    if (!it || !size) return;
    // Keep the real catalogue id so checkout's server-side product lookup
    // still matches — the chosen size rides along as selectedSize instead
    // of being baked into id (that used to make every showroom add-to-cart
    // fail checkout with "a product is unavailable").
    onAdd({ id: it.id, name: `${it.name} (${size})`, cat: "hoodies", price: it.price, old: it.old || null, icon: "🧥", badge: null, img: it.img, selectedSize: size, selectedColour: it.colour || null });
    setAdded(true);
    // the hoodie flies into the bag
    const from = addBtn.current && addBtn.current.getBoundingClientRect(), to = document.querySelector(".oc-cartbtn");
    if (from && to && !reduced) {
      const t = to.getBoundingClientRect(), im = document.createElement("img");
      im.src = it.views.front; im.alt = ""; im.className = "sr-fly";
      im.style.left = `${from.left + from.width / 2 - 40}px`; im.style.top = `${from.top - 60}px`;
      document.body.appendChild(im);
      const dx = t.left + t.width / 2 - (from.left + from.width / 2), dy = t.top + t.height / 2 - (from.top - 20);
      im.animate([{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: `translate(${dx * 0.5}px,${dy * 0.5 - 80}px) scale(.7)`, opacity: 1, offset: 0.55 }, { transform: `translate(${dx}px,${dy}px) scale(.15)`, opacity: 0.2 }],
        { duration: 900, easing: "cubic-bezier(.5,0,.2,1)" }).onfinish = () => { im.remove(); to.animate([{ transform: "scale(1)" }, { transform: "scale(1.12)" }, { transform: "scale(1)" }], { duration: 320 }); };
    }
  };
  const buy = () => {   // straight to checkout; only adds to the bag if this size isn't already in it
    if (!it || !size) return;
    if (!added) add();
    setTimeout(() => onBuyNow && onBuyNow(), added || reduced ? 0 : 650);
  };
  const viewKeys = it ? ["front", ...(it.views.threeQ ? ["threeQ"] : []), "sideL", "side", "back"] : [];
  const counts = useMemo(() => Object.fromEntries(COLLECTIONS.map(([k]) => [k, items.filter(x => k === "all" || x.col === k).length])), [items]);

  return (
    <section className="sr" ref={wrap} aria-label="The showroom: our hoodie rail in 3D">
      <div className="sr-sticky">
        <div className="sr-stage" ref={stage} tabIndex={0} onKeyDown={onKey} aria-label="Hoodie rail. Use the arrow keys to turn it and Enter to take the front hoodie down.">
          <Canvas className="sr-canvas" shadows={!mobile} dpr={mobile ? [1, 1.5] : [1, 1.8]} frameloop={onScreen ? "always" : "never"}
            gl={{ antialias: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
            camera={{ fov: mobile ? 44 : 40, position: [0, 2.5, mobile ? 12 : 11.5], near: 0.1, far: 60 }}
            onCreated={({ gl }) => { gl.domElement.addEventListener("webglcontextlost", e => { e.preventDefault(); onFail && onFail(); }); }}>
            <color attach="background" args={["#141311"]} />
            <fog attach="fog" args={["#141311", 13, 30]} />
            <Environment resolution={128} frames={1}>
              <Lightformer form="ring" intensity={3} position={[0, CEIL_Y, 0]} rotation-x={Math.PI / 2} scale={RING_R * 2} />
              <Lightformer form="rect" intensity={2} position={[-3.4, CEIL_Y, 1]} rotation-x={Math.PI / 2} scale={[0.2, 12, 1]} />
              <Lightformer form="rect" intensity={2} position={[3.4, CEIL_Y, 1]} rotation-x={Math.PI / 2} scale={[0.2, 12, 1]} />
              <Lightformer form="rect" intensity={0.8} position={[0, 2, -6]} scale={[20, 3, 1]} color="#f3e6d6" />
              <Lightformer form="rect" intensity={0.25} position={[0, 2, 10]} rotation-y={Math.PI} scale={[16, 4, 1]} color="#ffffff" />
            </Environment>
            <Lights mobile={mobile} reveal={reveal} />
            <Room reveal={reveal} />
            <Rail items={items} ctl={ctl} mobile={mobile} reveal={reveal} onFront={setFront} onPick={pick} onView={setView} />
            <CameraRig ctl={ctl} mobile={mobile} reveal={reveal} />
          </Canvas>
          {!ready && <div className="sr-loading" aria-live="polite"><span>Opening the store</span><i /></div>}
        </div>

        {/* rail controls */}
        <div className={`sr-ui ${sel >= 0 ? "is-off" : ""}`}>
          {fr && ready && (
            <div className="sr-now" key={fr.id}>
              <div className="sr-now-txt"><b>{fr.name}</b><span>{fr.price > 0 ? fmt(fr.price) : "Price coming soon"}</span></div>
              <button className="sr-btn sr-btn-light" onClick={() => pick(front)}>Take it down</button>
            </div>
          )}
          <div className="sr-bar">
            <button className="sr-arrow" onClick={() => turnRail(-1)} aria-label="Turn the rail left">‹</button>
            <div className="sr-cols" role="tablist" aria-label="Collections">
              {COLLECTIONS.map(([k, l]) => <button key={k} role="tab" aria-selected={col === k} onClick={() => chooseCol(k)}>{l}<span>{counts[k]}</span></button>)}
            </div>
            <button className="sr-arrow" onClick={() => turnRail(1)} aria-label="Turn the rail right">›</button>
          </div>
          <p className={`sr-hint ${touched ? "is-gone" : ""}`}>{mobile ? "Swipe to turn the rail. Tap a hoodie to take it down." : "Drag to turn the rail. Click a hoodie to take it down."}</p>
          <button className="sr-all" onClick={onShopAll}>Shop all products</button>
        </div>

        {/* the picked hoodie */}
        {it && (
          <aside className="sr-panel" key={it.id} aria-label={it.name}>
            <button className="sr-back" onClick={close}>Back to the rail</button>
            <h2 className="sr-name">{it.name}</h2>
            <div className="sr-price">{priced ? <><b>{fmt(it.price)}</b>{it.old > it.price && <s>{fmt(it.old)}</s>}</> : <b className="soon">Price coming soon</b>}</div>
            {it.note && <p className="sr-note">{it.note}</p>}
            <div className="sr-lbl">Turn it <span>drag the hoodie, or pick a view</span></div>
            <div className="sr-views">
              {viewKeys.map(v => <button key={v} aria-pressed={!closeup && view === v} onClick={() => setViewTo(v)}>{VIEW_NAME[v]}</button>)}
              <button aria-pressed={closeup} onClick={() => setCloseup(x => !x)}>Close-up</button>
              <button className="sr-zoom" aria-pressed={zoom} onClick={() => { ctl.current.zoom = !zoom; setZoom(!zoom); }}>{zoom ? "Zoom out" : "Zoom in"}</button>
            </div>
            {closeup && <img className="sr-closeup" src={it.closeup} alt={`${it.name}, close-up of the hood and fabric`} />}
            {priced ? (
              <>
                <div className="sr-lbl">Size {size ? <span>{size} selected</span> : <span>pick one to continue</span>}</div>
                <div className="sr-sizes">{SIZES.map(s => <button key={s} aria-pressed={size === s} onClick={() => { setSize(s); setAdded(false); }}>{s}</button>)}</div>
                <div className="sr-acts">
                  <button ref={addBtn} className="sr-btn sr-btn-red" disabled={!size} onClick={add}>{added ? "Added to bag" : size ? "Add to bag" : "Choose a size"}</button>
                  <button className="sr-btn sr-btn-dark" disabled={!size} onClick={buy}>Buy now</button>
                </div>
              </>
            ) : (
              <a className="sr-btn sr-btn-dark sr-pre" href={`https://wa.me/8801881816245?text=${encodeURIComponent(`Hi! I'd like to pre-order the ${it.name}.`)}`} target="_blank" rel="noreferrer">Pre-order on WhatsApp</a>
            )}
            <div className="sr-more">
              <button onClick={() => setFit(true)}>Try it on</button>
              <button onClick={() => onDetails && onDetails(it.id)}>Size chart and details</button>
            </div>
          </aside>
        )}
        {fit && it && createPortal(<FittingRoom item={it} onClose={() => setFit(false)} />, document.body)}
      </div>
    </section>
  );
}
