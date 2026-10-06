# Stillwater

A fresh spa-building sandbox built with **Godot 4.6.3**, its native 3D scene system, Compatibility renderer, imported glTF assets, skeletal animation, and browser export. The art uses Kay Lousberg’s **KayKit** CC0 furniture, restaurant props, scenery and characters, with a matching, authored Blender spa fixture kit. Warm timber, limestone, linen, sage roofs, rounded silhouettes and quiet green water carry through the entire world.

**[Play on the website](https://markbobthomas.github.io/spa/)** · [Download](https://markbobthomas.github.io/spa/download.html) · [Credits](https://markbobthomas.github.io/spa/credits.html)

Choose **Start your own spa** to begin with a lobby and reception, or **Explore this retreat** for a furnished example. Extend connected stone, cedar or garden tiles, then place baths, hot tubs, cold plunges, steam rooms, saunas, showers, bathrooms, all-gender changing rooms, lounges, cafes, bars, seating, plants and garden features. The collection contains 38 furnishings and facilities, with model thumbnails rendered by the actual game engine.

Guests arrive at reception, walk around furnishings, choose reachable facilities, use them, and earn income. Their choices respond to quality, freshness, nearby plants, support facilities, distance, crowding and personal preferences. Free building is the default; budget mode adds construction costs, visit income and removal refunds. Select a facility to inspect its use and refresh it. Undo restores recent building changes.

## Play from a local HTML file

Download **Stillwater.zip**, extract it, and open **Stillwater.html** in a modern browser with WebGL 2 and WebAssembly. The HTML embeds Godot’s engine, the game pack, its assets, worker scripts and collection thumbnails. It can run without a server or an internet connection. The large HTML takes a moment to open. The website provides the same game as smaller separate files.

Your spa saves automatically in browser storage. Menu → Export a backup downloads a JSON save for another device or browser. Local-file storage support varies; keep an exported backup of work you care about. The rebuild uses version-two saves. The previous game and its original saves remain available at [Previous version](https://markbobthomas.github.io/spa/classic/).

## Controls

- Drag to orbit; vertical movement adjusts the viewing angle. Wheel or +/− zooms from a close view of individual furniture to the whole resort.
- Right-drag, middle-drag or Shift-drag pans. Q/E turn the camera; Home restores its position.
- Touch drag orbits; pinch zooms. Tap to place after choosing a furnishing.
- R rotates a furnishing. C opens or closes roofs; rooms open while building. P enters or leaves photo view.
- 1–4 selects Explore, Extend, Furnish or Remove. Space pauses guests; Escape returns to exploring.
- Menu provides time-of-day-independent saving, import/export, free/budget mode, a reference retreat, a new spa, and Balanced/Lush/Simple graphics. The sun button changes morning, golden hour and evening lighting.

The view is orthographic and freely rotatable. Zoom has a broad finite range; this is not a mathematically infinite camera. Floors support 2,500 tiles and the simulation supports 18 simultaneous guests. Performance depends on device, chosen graphics detail and resort size. WebGL 2 and WebAssembly are required for this native engine build.

## Develop with Godot

Open `godot/project.godot` in the **Godot 4.6.3 editor**. The browser version is the complete game: the native scene, camera, placement, pathfinding, saving and visitor simulation are GDScript; its responsive editor interface is an HTML overlay connected through Godot’s JavaScriptBridge. Running the scene directly in the editor provides the 3D world and keyboard/camera controls; the browser export provides the collection and menus.

Use the existing checkout at `/workspace/spa`; cloud tasks are already isolated and do not require an extra Git worktree. The managed runtime supplies Godot 4.6.3, Blender, Python, Node, Chromium and Playwright. The official, checksum-verified web export templates live in `/workspace/.godot-data/godot/export_templates/4.6.3.stable`.

Build from the repository root:

```sh
python3 tools/bootstrap-godot.py
python3 tools/build.py
python3 -m http.server 8011 --bind 127.0.0.1 --directory _site
```

The build sets workspace-local XDG directories, imports current resources, exports the single-threaded Godot Web target, packages the standalone HTML and licenses, and verifies archive integrity. It produces `_site/`, `Stillwater.html`, `Stillwater.zip`, and `_site/Stillwater-Godot-project.zip`. No runtime CDN or external asset downloads are used. The bootstrap helper downloads the official 1.2 GB template archive only if templates are absent, checks its pinned SHA-512, and extracts the web templates.

`godot/scripts/spa.gd` owns the game. `godot/assets/catalog.json` describes its collection. `web/shell.html` is the custom Godot HTML export template. `tools/bake-spa.py` is the original Blender source for the bath and architectural kit; optionally regenerate it with `blender --background --python tools/bake-spa.py`, then rebuild. The imported KayKit assets and their original licenses are retained in `godot/assets/kaykit/`. Sources, modifications and distribution hashes are documented alongside them. The original implementation is archived in `legacy/`.

## Verified checks

Run the native integration checks with the same environment paths used by the builder:

```sh
XDG_DATA_HOME=/workspace/.godot-data XDG_CONFIG_HOME=/workspace/.godot-config XDG_CACHE_HOME=/tmp/stillwater-cache godot --headless --path godot --script scripts/checks.gd
node tests/browser.cjs
```

The native checks exercise placement, collisions, budgeting, guest navigation and completed visits, revenue, save/import validation, removal refunds, undo, and the effect of cleanliness on actual facility choices. Browser checks exercise the exported engine, HTML controls, native mouse picking, mobile and high-DPI sizing, camera ranges, persistent saving, and the standalone HTML with networking disabled. The test browser uses software rendering, so its performance does not represent a hardware-accelerated user browser.

With `_site/` served on port 8011, `node tools/visuals.cjs` regenerates all 38 thumbnails and the three previews from the actual Godot renderer. Set `SPA_URL` to change the test/preview server. Publish the generated `_site/` contents to the repository’s `gh-pages` branch to update the existing website.
