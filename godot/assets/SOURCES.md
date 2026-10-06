# Art sources and modifications

All downloaded art comes from **Kay Lousberg / KayKit**, released under **CC0 1.0**. Original license texts are retained in each pack directory and distributed with the browser build. The coherent gradient-textured, soft low-poly style is shared across these packs. No photographic PBR furniture from the previous game is loaded by the new Godot project.

| Pack | Original public distribution | Use |
| --- | --- | --- |
| Furniture Bits 1.0 | https://github.com/KayKit-Game-Assets/KayKit-Furniture-Bits-1.0 | Couches, armchairs, chairs, tables, cabinets, shelves, lamps, rugs, plants |
| Restaurant Bits 1.0 | https://github.com/KayKit-Game-Assets/KayKit-Restaurant-Bits-1.0 | Cafe/bar counters, decorated dining tables, ceramics and food props |
| City Builder Bits 1.0 | https://github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0 | Garden benches and bushes |
| Medieval Hexagon Pack 1.0 | https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0 | Garden trees, evergreen clusters and scenery |
| Character Pack Adventures 1.0 | https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0 | Rogue-derived spa guests, original skeletal rig and walking/seated/resting animations |

Download URLs and SHA-256 hashes of the original archives are in `kaykit/sources.json`. `manifest.json` records distributed asset hashes and sizes. The Dungeon pack was evaluated during art selection but is not included in the game.

The derivative `kaykit/characters/guest.glb` removes equipment and cape mesh references while preserving the original skeleton and animation data. Godot assigns linen, sage and clay clothing materials at runtime, preserving the original textured head and hair. Selected furniture and scenery receive matching material colors and matte surface settings; meshes and UVs otherwise retain their original authorship. Nature models and furniture are scaled to the shared spa grid.

The spa fixtures, tile kit, curved pavilion roofs, trim, reception desk, plants, water basins and garden additions are authored for this project in Blender, with beveled geometry and a restrained material palette. Their editable generation source is `tools/bake-spa.py`. Pieces are merged by material and roof/water visibility group before glTF export. Godot instances the floor meshes and animates the water surfaces and steam; it does not generate the fixture geometry in browser drawing code.

Godot 4.6.3 is MIT licensed; its license and third-party copyright notices are distributed in `web/licenses/` and on the credits page. The export templates were downloaded from the official Godot release and verified against its SHA-512 checksum.
