# Local engine assets

- `velvet-chair.glb`: **Sheen Chair**, Eric Chadwick / Wayfair, 2020. CC0 1.0. Source: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/SheenChair . Unmodified. See chair-source.md and CC0-1.0.txt.
- `leather-sofa.glb`: **Sheen Wood Leather Sofa**, original by Fran Calvente (2021, CC0), improvements by Eric Chadwick / Darmstadt Graphics Group GmbH (2024, CC BY 4.0). Source: https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/SheenWoodLeatherSofa . Unmodified; fitted to facility footprints at runtime. See sofa-source.md and CC-BY-4.0.txt.
- `grass-trees.glb`, `grass-trees-tall.glb`: Kenney, Starter Kit City Builder, CC0 assets. Source: https://github.com/KenneyNL/Starter-Kit-City-Builder . Ground-pad triangles are removed and the original colormap is embedded into each GLB for offline use; models are scaled and positioned at runtime. See kenney-source.md.
- `garden-light.hdr`: Potsdamer Platz HDRI from HDRI Haven / Poly Haven, CC0. Distributed by https://github.com/pmndrs/drei-assets/tree/master/hdri . Unmodified. Source file: https://raw.githubusercontent.com/pmndrs/drei-assets/master/hdri/potsdamer_platz_1k.hdr . Poly Haven license: https://polyhaven.com/license .

SHA-256 and byte counts are recorded in manifest.json. The packer embeds the files in asset-data.js so local HTML and the standalone build run without an asset server.

`olive-tree.glb` and `indoor-palm.glb` are original Stillwater models baked from `tools/bake-plants.py` in Blender. They contain curved leaves, modeled stems, soil, and a ceramic pot, with no external dependencies.
