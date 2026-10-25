// ─────────────────────────────────────────────────────────────
//  TRY-ON 3D SCENE (three.js) — loaded only inside the Try-On studio.
//  public/3d/tryon/<male|female>.glb : a mannequin (MakeHuman CC0 body) wearing
//  a cloth-simulated hoodie, skinned to a small skeleton, ambient occlusion
//  baked into vertex colours. Each hoodie is shown by recolouring the fleece
//  and laying its chest print (public/3d/decals) onto the front.
//  Two uses:  avatar mode  – orbit around the mannequin
//             photo mode   – pose the hoodie to match a person in a photo
// ─────────────────────────────────────────────────────────────
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const ROOT = "/3d/tryon/";
let loader = null;
function gltfLoader() {
  if (!loader) {
    loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);   // models are meshopt-compressed + quantised (glTF-Transform)
  }
  return loader;
}
const assetCache = new Map();
function loadBody(gender) {
  if (!assetCache.has(gender)) {
    assetCache.set(gender, Promise.all([
      gltfLoader().loadAsync(ROOT + gender + ".glb"),
      fetch(ROOT + gender + ".json").then(r => r.json()),
    ]));
  }
  return assetCache.get(gender);
}
let decalInfo = null;
const decalJson = () => (decalInfo = decalInfo || fetch(ROOT + "decals.json").then(r => r.json()));
const texCache = new Map();
function loadTex(url) {
  if (!texCache.has(url)) {
    texCache.set(url, new Promise(res => new THREE.TextureLoader().load(url, t => {
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; res(t);
    }, undefined, () => res(null))));
  }
  return texCache.get(url);
}

const lin = hex => new THREE.Color(hex); // THREE.Color converts sRGB hex to the working (linear) space
// GLTFLoader strips "." (and other reserved characters) from node names: "upper_arm.L" -> "upper_armL"
const boneKey = name => String(name).replace(/[\s.:/[\]]/g, "");

// fleece with the print laid on its front (print UVs + front mask come with the mesh)
function fleece(withDecal) {
  const m = new THREE.MeshPhysicalMaterial({
    color: 0x888888, roughness: 0.93, metalness: 0, sheen: 0.6, sheenRoughness: 0.55,
    sheenColor: new THREE.Color(0xffffff), vertexColors: true, side: THREE.DoubleSide,
  });
  if (!withDecal) return m;
  m.userData.u = { uDecal: { value: null }, uDecalOn: { value: 0 }, uDecalT: { value: new THREE.Vector4() } };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, m.userData.u);
    sh.vertexShader = "attribute vec2 printUv;\nattribute float frontMask;\nvarying vec2 vPUv;\nvarying float vFront;\n" +
      sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvPUv = printUv;\nvFront = frontMask;");
    sh.fragmentShader = "uniform sampler2D uDecal;\nuniform float uDecalOn;\nuniform vec4 uDecalT;\nvarying vec2 vPUv;\nvarying float vFront;\n" +
      sh.fragmentShader.replace("#include <map_fragment>", `#include <map_fragment>
      if (uDecalOn > 0.5 && gl_FrontFacing) {
        vec2 t = vec2(uDecalT.x * vPUv.x + uDecalT.y, uDecalT.z * (1.0 - vPUv.y) + uDecalT.w);
        if (t.x > 0.0 && t.x < 1.0 && t.y > 0.0 && t.y < 1.0) {
          vec4 dc = texture2D(uDecal, vec2(t.x, 1.0 - t.y));
          diffuseColor.rgb = mix(diffuseColor.rgb, dc.rgb, dc.a * clamp(vFront, 0.0, 1.0));
        }
      }`);
  };
  m.customProgramCacheKey = () => "fleece-decal";
  return m;
}

export const SKIN_TONES = ["#ECE7E1", "#E6BEA0", "#B9825D", "#6E4A33"]; // mannequin, light, medium, deep

export class FittingScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;
    pm.dispose();
    const key = new THREE.DirectionalLight(0xfff4ea, 2.3); key.position.set(-1.8, 2.4, 2.2); this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xf2f0ff, 0.55); fill.position.set(2.2, 0.6, 1.6); this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xe8eeff, 1.2); rim.position.set(1.6, 1.8, -2.4); this.scene.add(rim);
    this.lights = { key, rim };
    // soft contact shadow under the feet
    const sh = document.createElement("canvas"); sh.width = sh.height = 128;
    const g = sh.getContext("2d"), rg = g.createRadialGradient(64, 64, 2, 64, 64, 62);
    rg.addColorStop(0, "rgba(0,0,0,.42)"); rg.addColorStop(0.55, "rgba(0,0,0,.16)"); rg.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
    this.ground = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.75), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sh), transparent: true, depthWrite: false }));
    this.ground.rotation.x = -Math.PI / 2;
    this.scene.add(this.ground);
    this.persp = new THREE.PerspectiveCamera(26, 1, 0.05, 20);
    this.ortho = new THREE.OrthographicCamera(0, 1, 0, -1, -10, 10);
    this.camera = this.persp;
    this.controls = new OrbitControls(this.persp, canvas);
    Object.assign(this.controls, { enablePan: false, enableDamping: true, dampingFactor: 0.08, rotateSpeed: 0.8, autoRotate: true, autoRotateSpeed: 1.1,
      minPolarAngle: 1.05, maxPolarAngle: 1.85, minDistance: 1.2, maxDistance: 6.2 });
    this.controls.addEventListener("start", () => { this.controls.autoRotate = false; });
    this.mats = { skin: new THREE.MeshStandardMaterial({ color: lin(SKIN_TONES[0]), roughness: 0.6, metalness: 0, vertexColors: true }),
      fabric: fleece(true), pocket: fleece(false),
      cord: new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.75 }),
      tip: new THREE.MeshStandardMaterial({ color: 0xd9d9d6, metalness: 1, roughness: 0.28 }),
      occluder: new THREE.MeshBasicMaterial({ colorWrite: false }) };
    this.models = {};      // gender -> { root, info, parts }
    this.current = null;
    this.mode = "avatar";
    this.raf = 0;
    this.alive = true;
    this.onFrame = null;
    this.resize();
    // the stage changes size without a window resize (phone panel switching tabs, rotation)
    if (window.ResizeObserver) { this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(canvas); }
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  async setBody(gender) {
    this.gender = gender;
    if (!this.models[gender]) {
      const [gltf, info] = await loadBody(gender);
      if (!this.alive) return;
      const root = gltf.scene;
      const parts = { meshes: [], cords: [], bones: {} };
      root.traverse(o => {
        if (o.isBone) parts.bones[boneKey(o.name)] = o;
        if (!o.isMesh) return;
        o.frustumCulled = false;
        const n = o.name.toLowerCase();
        const geo = o.geometry;
        if (n.startsWith("hoodie")) {
          // keep the print UVs and front mask under names the shader expects
          if (geo.attributes.uv) geo.setAttribute("printUv", geo.attributes.uv);
          if (geo.attributes.uv1) {
            const u1 = geo.attributes.uv1, fm = new Float32Array(u1.count);
            for (let i = 0; i < u1.count; i++) fm[i] = u1.getX(i);
            geo.setAttribute("frontMask", new THREE.BufferAttribute(fm, 1));
          } else geo.setAttribute("frontMask", new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count), 1));
          o.material = this.mats.fabric; parts.hoodie = o;
        } else if (n.startsWith("pocket")) { o.material = this.mats.pocket; parts.pocket = o; }
        else if (n.startsWith("cord") || n.startsWith("tip")) {
          o.material = n.startsWith("tip") ? this.mats.tip : this.mats.cord;
          // positions are quantised int16: keep a float copy so drawstrings can be lengthened
          const a = geo.attributes.position, f = new Float32Array(a.count * 3);
          for (let i = 0; i < a.count; i++) { f[i * 3] = a.getX(i); f[i * 3 + 1] = a.getY(i); f[i * 3 + 2] = a.getZ(i); }
          geo.setAttribute("position", new THREE.BufferAttribute(f, 3));
          parts.cords.push(o);
        }
        else if (n.startsWith("body")) {
          o.material = this.mats.skin; parts.body = o;
          // index buffer without the arms, for photo mode's invisible occluder
          const si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight, idx = geo.index;
          if (si && sw && idx && o.skeleton) {
            const armBone = o.skeleton.bones.map(b => /^(upper_arm|forearm|hand)/.test(b.name));
            const arm = new Uint8Array(si.count);
            for (let i = 0; i < si.count; i++) {
              let w = 0;
              for (let k = 0; k < 4; k++) if (armBone[si.getComponent(i, k)]) w += sw.getComponent(i, k);
              arm[i] = w > 0.35 ? 1 : 0;
            }
            const keep = [];
            for (let t = 0; t < idx.count; t += 3) {
              const a = idx.getX(t), b = idx.getX(t + 1), c = idx.getX(t + 2);
              if (!arm[a] && !arm[b] && !arm[c]) keep.push(a, b, c);
            }
            parts.fullIndex = idx;
            parts.occIndex = new THREE.BufferAttribute(si.count > 65535 ? new Uint32Array(keep) : new Uint16Array(keep), 1);
          }
        }
        parts.meshes.push(o);
      });
      root.updateMatrixWorld(true);
      // remember the rest pose of every bone (photo fitting poses them, avatar mode restores them)
      Object.values(parts.bones).forEach(b => { b.userData.rest = { q: b.quaternion.clone(), p: b.position.clone(), s: b.scale.clone() }; });
      parts.cords.forEach(c => { c.userData.rest = c.scale.clone(); });
      this.models[gender] = { root, info, parts };
    }
    Object.entries(this.models).forEach(([k, m]) => { if (m.root.parent) this.scene.remove(m.root); if (k === gender) this.scene.add(m.root); });
    this.current = this.models[gender];
    if (this.item) await this.setHoodie(this.item);
    if (this.mode === "avatar") this.frameAvatar();
  }

  frameAvatar() {
    if (!this.current) return;
    const box = new THREE.Box3().setFromObject(this.current.parts.body || this.current.root);
    const c = box.getCenter(new THREE.Vector3()), h = box.max.y - box.min.y;
    this.ground.position.set(c.x, box.min.y + 0.002, c.z);
    this.ground.visible = true;
    // frame from mid-thigh to just above the head, centred on the hoodie
    const top = box.max.y + h * 0.03, bottom = box.min.y + h * 0.36;
    const target = new THREE.Vector3(c.x, (top + bottom) / 2, c.z);
    const half = (top - bottom) / 2, tan = Math.tan(THREE.MathUtils.degToRad(this.persp.fov / 2));
    const dist = Math.max(half / tan, (h * 0.3) / (tan * Math.max(0.3, this.persp.aspect)));
    this.controls.maxDistance = dist * 1.9; this.controls.minDistance = dist * 0.45;
    if (!this.framed) this.persp.position.set(target.x + dist * 0.26, target.y + 0.04, target.z + dist * 0.965);
    this.framed = true;
    this.controls.target.copy(target);
    this.controls.update();
  }

  // colour + print for one hoodie. item: { key?, tone, cordLen? }
  async setHoodie(item) {
    this.item = item;
    const M = this.current; if (!M) return;
    const tone = lin(item.tone || "#3A3A3D");
    this.mats.fabric.color.copy(tone); this.mats.pocket.color.copy(tone);
    this.mats.cord.color.copy(tone).multiplyScalar(0.92);
    const dark = tone.r + tone.g + tone.b < 0.1;
    this.mats.fabric.sheen = this.mats.pocket.sheen = dark ? 0.45 : 0.6;
    const u = this.mats.fabric.userData.u;
    u.uDecalOn.value = 0;
    let len = 0.2;
    if (item.key) {
      const info = await decalJson();
      const d = info[item.key];
      if (d && d[this.gender]) {
        const tex = await loadTex(d.img);
        if (tex && this.item === item) {
          u.uDecal.value = tex; u.uDecalT.value.fromArray(d[this.gender]); u.uDecalOn.value = 1;
        }
        len = d.cordLen || len;
      }
    }
    // drawstrings: scale from the top so long ones hang lower
    M.parts.cords.forEach(c => { const r = c.userData.rest; c.scale.set(r.x, r.y, r.z); });
    const k = Math.max(0.45, Math.min(1.5, len / 0.2));
    M.parts.cords.forEach(c => { c.userData.len = k; });
    this.applyCords();
  }
  applyCords() {
    // cords are separate skinned meshes; scaling their vertices along Y about the top is done once per length
    const M = this.current; if (!M) return;
    M.parts.cords.forEach(c => {
      const g = c.geometry, k = c.userData.len || 1;
      if (!g.userData.base) g.userData.base = g.attributes.position.array.slice();
      const b = g.userData.base, p = g.attributes.position.array;
      let top = -1e9; for (let i = 1; i < b.length; i += 3) top = Math.max(top, b[i]);
      for (let i = 0; i < b.length; i += 3) { p[i] = b[i]; p[i + 1] = top - (top - b[i + 1]) * k; p[i + 2] = b[i + 2]; }
      g.attributes.position.needsUpdate = true;
    });
  }
  setSkinTone(hex) { this.mats.skin.color.copy(lin(hex)); }

  // ── avatar mode
  avatarMode() {
    this.mode = "avatar";
    this.resize();
    this.camera = this.persp;
    this.controls.enabled = true;
    this.renderer.toneMappingExposure = 1.0;
    if (this.current) {
      this.resetPose();
      this.current.parts.body.material = this.mats.skin;
      if (this.current.parts.fullIndex) this.current.parts.body.geometry.setIndex(this.current.parts.fullIndex);
      this.current.root.position.set(0, 0, 0); this.current.root.quaternion.identity(); this.current.root.scale.set(1, 1, 1);
    }
    this.ground.visible = true;
    this.frameAvatar();
  }
  resetPose() {
    const M = this.current; if (!M) return;
    Object.values(M.parts.bones).forEach(b => { const r = b.userData.rest; b.quaternion.copy(r.q); b.position.copy(r.p); b.scale.copy(r.s); });
    M.root.updateMatrixWorld(true);
  }

  // ── photo mode: pose + place the hoodie over a person (MediaPipe landmarks)
  // fit: { lm: [{x,y,z}] normalised, wlm: world landmarks (m), w, h: image size in px, size: 1 = regular fit }
  photoMode(fit) {
    const M = this.current; if (!M) return null;
    this.mode = "photo";
    this.controls.enabled = false;
    this.ground.visible = false;
    M.parts.body.material = this.mats.occluder;   // the mannequin only hides what's behind the person
    M.parts.body.renderOrder = -1;
    if (M.parts.occIndex) M.parts.body.geometry.setIndex(M.parts.occIndex);
    const { lm, wlm, w, h } = fit;
    const P = i => new THREE.Vector2(lm[i].x * w, lm[i].y * h);
    const W = i => (wlm && wlm[i] ? new THREE.Vector3(wlm[i].x, wlm[i].y, wlm[i].z) : null);
    // camera: one world unit = one image pixel, y up (image y is flipped)
    const cam = this.ortho; cam.left = 0; cam.right = w; cam.top = 0; cam.bottom = -h; cam.near = -5000; cam.far = 5000;
    cam.position.set(0, 0, 1000); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
    this.camera = cam;
    this.resetPose();
    const J = M.info.joints, A = M.info.anchors || {};
    const v3 = a => new THREE.Vector3(a[0], a[1], a[2]);
    // MediaPipe's shoulder points sit further in (and its hips lower) than the skeleton's joints:
    // use the calibrated equivalents so a person facing the camera isn't mistaken for a turned one
    const shL = v3(A.lsh || J["l-shoulder"]), shR = v3(A.rsh || J["r-shoulder"]);
    const hipL = v3(A.lhip || J["l-upper-leg"]), hipR = v3(A.rhip || J["r-upper-leg"]);
    const mSh = shL.clone().add(shR).multiplyScalar(0.5), mHip = hipL.clone().add(hipR).multiplyScalar(0.5);
    // MediaPipe's "left" is the person's left = our model's +x side (they face the camera like the mannequin)
    const iShL = P(11), iShR = P(12), iHipL = P(23), iHipR = P(24);
    const iSh = iShL.clone().add(iShR).multiplyScalar(0.5);
    const shW = iShL.distanceTo(iShR);
    const mShW = shL.distanceTo(shR), mTorso = mSh.distanceTo(mHip);
    const vis0 = i => (lm[i].visibility === undefined ? 1 : lm[i].visibility);
    let iHip = iHipL.clone().add(iHipR).multiplyScalar(0.5);
    if (Math.min(vis0(23), vis0(24)) < 0.25) {
      // hips out of the picture: assume ordinary proportions straight down from the shoulders
      const across = iShL.clone().sub(iShR), down = new THREE.Vector2(-across.y, across.x).normalize();
      if (down.y < 0) down.multiplyScalar(-1);
      iHip = iSh.clone().add(down.multiplyScalar(shW * mTorso / mShW));
    }
    const torso = iSh.distanceTo(iHip);
    let s = shW / mShW;
    const sT = torso / mTorso;
    // turned to the side: shoulders look narrow, use the torso length instead and yaw the model
    let yaw = 0;
    if (s < sT * 0.82) {
      const ratio = Math.min(1, s / sT);
      yaw = Math.acos(Math.max(0.45, ratio));
      // MediaPipe world z grows away from the camera: the shoulder that is further back sets the direction
      const wl = W(11), wr = W(12);
      if (wl && wr && wl.z < wr.z) yaw = -yaw;
      s = sT;
    }
    const sy = THREE.MathUtils.clamp(sT / s, 0.82, 1.25);   // longer / shorter torso than the mannequin
    s *= fit.size || 1;
    const roll = Math.atan2(iShL.y - iShR.y, iShL.x - iShR.x);           // image space, x to the person's left
    const root = M.root;
    root.scale.set(s, s * sy, s);
    root.quaternion.setFromEuler(new THREE.Euler(0, yaw, -roll, "ZYX"));
    root.position.set(0, 0, 0);
    root.updateMatrixWorld(true);
    // put the model's shoulder midpoint on the person's
    const wSh = mSh.clone().applyMatrix4(root.matrixWorld);
    root.position.set(iSh.x - wSh.x, -iSh.y - wSh.y, 0);
    root.updateMatrixWorld(true);
    // arms: aim upper arm and forearm at the person's elbow and wrist
    const B = name => M.parts.bones[boneKey(name)];
    const aim = (bone, child, from2, to2, fromW, toW) => {
      if (!bone || !child) return;
      const a = bone.getWorldPosition(new THREE.Vector3()), b = child.getWorldPosition(new THREE.Vector3());
      const cur = b.sub(a).normalize();
      const d2 = new THREE.Vector2(to2.x - from2.x, -(to2.y - from2.y));
      let z = 0;
      if (fromW && toW) {
        const dw = toW.clone().sub(fromW), xy = Math.hypot(dw.x, dw.y) || 1e-6;
        z = THREE.MathUtils.clamp(-dw.z / xy, -1.4, 1.4) * d2.length();
      }
      const tgt = new THREE.Vector3(d2.x, d2.y, z).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(cur, tgt);
      const pw = bone.parent.getWorldQuaternion(new THREE.Quaternion());
      const bw = bone.getWorldQuaternion(new THREE.Quaternion());
      bone.quaternion.copy(pw.invert().multiply(q.multiply(bw)));
      bone.updateMatrixWorld(true);
    };
    const vis = i => (lm[i].visibility === undefined ? 1 : lm[i].visibility);
    [["L", 11, 13, 15], ["R", 12, 14, 16]].forEach(([sd, a, e, wv]) => {
      if (vis(e) < 0.35) return;
      aim(B("upper_arm." + sd), B("forearm." + sd), P(a), P(e), W(a), W(e));
      if (vis(wv) < 0.35) return;
      aim(B("forearm." + sd), B("hand." + sd), P(e), P(wv), W(e), W(wv));
    });
    root.updateMatrixWorld(true);
    const nv = new THREE.Vector3().fromArray(M.info.neckV).applyMatrix4(root.matrixWorld);
    return { s, yaw, roll, neckY: -nv.y };
  }

  // lighting that roughly follows the photo's exposure and colour
  matchPhoto({ lum = 0.5, tint = [1, 1, 1] } = {}) {
    this.renderer.toneMappingExposure = THREE.MathUtils.clamp(0.62 + lum * 0.85, 0.6, 1.35);
    const c = new THREE.Color(tint[0], tint[1], tint[2]);
    this.lights.key.color.copy(new THREE.Color(0xfff4ea).lerp(c, 0.35));
  }

  resize() {
    if (this.mode === "photo" && this.size) return;     // hidden while the photo is shown
    const w = Math.max(1, this.canvas.clientWidth), h = Math.max(1, this.canvas.clientHeight);
    if (this.size && this.size[0] === w && this.size[1] === h) return;
    this.renderer.setSize(w, h, false);
    this.persp.aspect = w / h; this.persp.updateProjectionMatrix();
    this.size = [w, h];
  }
  // render the photo-mode hoodie at the photo's own resolution (for saving)
  renderAt(w, h) {
    const prev = this.renderer.getPixelRatio(), [cw, ch] = this.size;
    this.renderer.setPixelRatio(1); this.renderer.setSize(w, h, false);
    this.renderer.render(this.scene, this.camera);
    const out = document.createElement("canvas"); out.width = w; out.height = h;
    out.getContext("2d").drawImage(this.canvas, 0, 0, w, h);
    this.renderer.setPixelRatio(prev); this.renderer.setSize(cw, ch, false);
    return out;
  }
  loop() {
    if (!this.alive) return;
    if (this.mode === "avatar") {   // photo mode renders on demand (renderAt)
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    }
    if (this.onFrame) this.onFrame();
    this.raf = requestAnimationFrame(this.loop);
  }
  dispose() {
    this.alive = false;
    cancelAnimationFrame(this.raf);
    if (this.ro) this.ro.disconnect();
    this.controls.dispose();
    this.renderer.dispose();
  }
}
