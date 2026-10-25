# 3D hoodies + Try-On assets

Everything in this folder is generated, not hand-edited.

| Folder | What | Made with |
| --- | --- | --- |
| `rail/<hoodie>/<angle>.webp` | Turntable frames of each of our hoodies hanging on a hanger, one every 6° from -6° (facing) to 84° (side-on). The hoodie rail on the home page plays these. | Blender: cloth-simulated fleece hoodie, print taken from the product photo |
| `rail/generic/d<angle>.webp`, `k<angle>.webp` | A plain hoodie (shading layer `d`, highlights + hanger layer `k`) that the rail tints to each shop hoodie's colour | same |
| `tryon/male.glb`, `tryon/female.glb` | Mannequin wearing the hoodie, skinned so the arms can be posed, ambient occlusion baked in. Meshopt-compressed. | Blender + glTF-Transform |
| `tryon/*.json` | Joint positions of each mannequin and where each print sits on the hoodie | |
| `decals/<hoodie>.webp` | The chest print of each of our hoodies, cut out of the product photo | |
| `tryon/pose_landmarker_lite.task` | Body-pose model used by "Your photo". Loaded from Google's model store first; this copy is the fallback. | Google MediaPipe |

**Adding a new hoodie of ours to the 3D rail / Try-On** needs a new render. Until then it still
hangs on the rail and works in the Try-On as a plain hoodie in its colour (like the shop hoodies).

## Credits

- Mannequin bodies: [MakeHuman](https://github.com/makehumancommunity/makehuman) base mesh and targets, released as **CC0**.
- Pose model and runtime: [Google MediaPipe](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker) Pose Landmarker (lite), **Apache License 2.0**.
- 3D viewer: [three.js](https://threejs.org) (MIT).
