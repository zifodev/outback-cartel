# 3D hoodies + Try-On assets

Everything in this folder is generated, not hand-edited.

| Folder | What | Made with |
| --- | --- | --- |
| `tryon/male.glb`, `tryon/female.glb` | Mannequin wearing the hoodie, skinned so the arms can be posed, ambient occlusion baked in. Meshopt-compressed. | Blender + glTF-Transform |
| `tryon/*.json` | Joint positions of each mannequin and where each print sits on the hoodie | |
| `decals/<hoodie>.webp` | The chest print of each of our hoodies, cut out of the product photo | |
| `tryon/pose_landmarker_lite.task` | Body-pose model used by "Your photo". Loaded from Google's model store first; this copy is the fallback. | Google MediaPipe |

**Adding a new hoodie of ours to the Try-On with its own print** needs a decal render. Until then it
works in the Try-On as a plain hoodie in its colour (like the shop hoodies). The rail shows product photos.

## Credits

- Mannequin bodies: [MakeHuman](https://github.com/makehumancommunity/makehuman) base mesh and targets, released as **CC0**.
- Pose model and runtime: [Google MediaPipe](https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker) Pose Landmarker (lite), **Apache License 2.0**.
- 3D viewer: [three.js](https://threejs.org) (MIT).
