// ─────────────────────────────────────────────────────────────
//  Finds a person's body in a photo, entirely on the shopper's phone
//  (MediaPipe Pose Landmarker, Apache-2.0). The photo is never uploaded.
//  The ~13 MB WebAssembly runtime is bundled with the site; the pose model
//  comes from Google's MediaPipe model store, with a copy on our own site
//  as a fallback.
// ─────────────────────────────────────────────────────────────
import { PoseLandmarker } from "@mediapipe/tasks-vision";
import wasmLoaderPath from "@mediapipe/tasks-vision/vision_wasm_internal.js?url";
import wasmBinaryPath from "@mediapipe/tasks-vision/vision_wasm_internal.wasm?url";

const MODELS = [
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
  "/3d/tryon/pose_landmarker_lite.task",
];

let ready = null;
async function landmarker() {
  if (ready) return ready;
  ready = (async () => {
    const files = { wasmLoaderPath, wasmBinaryPath };
    let lastErr = null;
    for (const modelAssetPath of MODELS) {
      for (const delegate of ["GPU", "CPU"]) {
        try {
          return await PoseLandmarker.createFromOptions(files, {
            baseOptions: { modelAssetPath, delegate }, runningMode: "IMAGE", numPoses: 1,
            outputSegmentationMasks: true, minPoseDetectionConfidence: 0.4, minPosePresenceConfidence: 0.4,
          });
        } catch (e) { lastErr = e; }
      }
    }
    throw lastErr || new Error("Pose model could not load");
  })();
  ready.catch(() => { ready = null; });
  return ready;
}
export const warmUp = () => landmarker().catch(() => null);

// image: canvas with the (downscaled) photo. Returns null when nobody is found.
export async function findBody(image) {
  const pl = await landmarker();
  const r = pl.detect(image);
  if (!r || !r.landmarks || !r.landmarks.length) return null;
  const lm = r.landmarks[0], wlm = r.worldLandmarks && r.worldLandmarks[0];
  let mask = null;
  if (r.segmentationMasks && r.segmentationMasks[0]) {
    const m = r.segmentationMasks[0];
    try {
      const f = m.getAsFloat32Array();
      const c = document.createElement("canvas"); c.width = m.width; c.height = m.height;
      const id = c.getContext("2d").createImageData(m.width, m.height);
      for (let i = 0; i < f.length; i++) { id.data[i * 4 + 3] = Math.round(Math.min(1, Math.max(0, f[i])) * 255); }
      c.getContext("2d").putImageData(id, 0, 0);
      mask = c;
    } catch { mask = null; }
    r.segmentationMasks.forEach(x => x.close && x.close());
  }
  const v = i => (lm[i].visibility === undefined ? 1 : lm[i].visibility);
  // need both shoulders and at least one hip to place a hoodie
  if (Math.min(v(11), v(12)) < 0.3 || Math.max(v(23), v(24)) < 0.15) return { lm, wlm, mask, partial: true };
  return { lm, wlm, mask, partial: false };
}
