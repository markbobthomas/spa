# Stillwater

A tranquil spa-building sandbox presented as a miniature island resort. Painting pavilion tiles creates connected arched facades, curved tiled roofs, window boxes, dormers, and chimneys. Courtyard tiles make open limestone terraces. The shoreline and surrounding gardens grow with the layout. Domed steam houses, roofed baths, timber pergolas, rounded tree crowns, warm plaster, and teal and terracotta roofs give the spa a cohesive isometric style.

The renderer uses **Babylon.js 9.29**, a full browser game engine, with an orthographic camera for the isometric view. Native glTF loading brings in authored leather seating and velvet chairs with texture, normal, wood, and fabric sheen materials. Blender-baked olives and palms have curved individual leaves, branches, and ceramic pots. The architectural kit adds thousands of curved clay roof tiles as actual instanced geometry, together with domed baths, plaster archways, tiled pools, and gardens.

Babylon handles HDR environment lighting, physically based materials, contact-hardening shadows, screen-space ambient occlusion, anti-aliasing, bloom, warm steam particles, and planar lagoon reflections. The 28 facilities and furnishings include baths, steam rooms, changing rooms, cafes, bars, seating, and plants. The art combines imported models with the custom modular architecture; further improvement can come from replacing additional facility models through the same glTF pipeline.

## Website publishing

`node tools/site.cjs` builds the public static site in `_site/`, including the browser game, a download page, the complete offline ZIP, example resort, previews, and credits. It verifies the copied files against their source hashes and checks every local script reference. It publishes no repository metadata, credentials, or development tools.

For GitHub Pages, publish the contents of `_site/` to the `gh-pages` branch. In the repository’s **Settings → Pages**, choose **Deploy from a branch**, select **gh-pages** and **/(root)**, and save. The site address is `https://markbobthomas.github.io/spa/`; the download page is `https://markbobthomas.github.io/spa/download.html`.

## Play offline

For a compressed download, use **`Stillwater.zip`**, extract it, and open the included `Stillwater.html` in your browser. This avoids relying on the chat’s HTML file preview. The archive includes the complete game, a quick-start guide, the example resort, and license credits.

Open **`Stillwater.html`** in a modern browser. This is the complete game in one file, including its engine, models, textures, and HDR lighting. No installation, downloads, or network access are needed.

Alternatively, open `index.html` while keeping `engine.js`, `model-library.js`, `architecture.js`, `asset-data.js`, and the `vendor/` directory alongside it. Both versions embed model data to avoid local-file fetch restrictions. For development or browser tests, run this from `/workspace/spa`:

```sh
python3 -m http.server 8000 --bind 0.0.0.0
```

The spa begins with a lobby, reception desk, seating, plants, and an empty spa floor. Expand adjacent floor tiles and choose facilities from the collection. Guests enter through reception, navigate connected floors around furniture, use available facilities, and generate income. Quality, greenery, variety, cleanliness, and crowding influence their choices and happiness.

For a finished reference layout, use Menu → Import spa and choose [examples/island-retreat.json](examples/island-retreat.json). [preview.png](preview.png) shows its exterior; [preview-cutaway.png](preview-cutaway.png) shows its interiors; [preview-detail.png](preview-detail.png) shows close-up furniture, foliage, roof geometry, and wood grain. Import replaces the current layout, so export your work first if you want to keep it.

Free building is enabled initially. Switch to budget mode to spend your balance and earn visit revenue. Removing furnishings refunds 70% in budget mode. Refresh facilities in their inspection panel to restore cleanliness.

## Camera and building

- Drag to orbit; vertical drag changes the viewing angle.
- Wheel / + / − to zoom. Zoom ranges from 3 to 2,000 pixels per tile, rather than being mathematically infinite.
- Right-drag / Shift-drag / arrow keys to pan.
- On touch screens, drag to orbit and pinch to zoom. Furnish opens a collection drawer that closes after choosing an item.
- R rotates a furnishing before placement.
- C cycles whole buildings, camera-aware cutaways, and open roofs. Roofs open automatically while painting or furnishing.
- P opens photo view; P, Escape, or Return to building restores the interface. Camera controls still work in photo view.
- 1–4 selects explore, add floor, furnish, or remove.
- Space pauses the simulation; Escape closes menus and returns to explore.
- The home button restores the starting camera.

Drag with Add floor selected to paint adjacent tiles. Choose Courtyard or Pavilion in the floor palette; painting an existing tile changes its style. Pavilion tiles generate building sections automatically, with open archways between adjoining sections. Facilities must fit on unoccupied floor. Removing floor preserves connectivity. Inspection and removal use 3D picking, while placement targets the floor beneath the cursor. The spa supports 2,500 floor tiles and 28 simultaneous guests.

## Light and detail

Use the sun button, or the menu on small screens, to choose morning, golden hour, or evening. Paper lanterns cast warm local light. Cutaway lowers the walls facing the camera and removes the near roof slope; Whole buildings restores the complete exterior. Open sky removes roofs. All three modes are also available in the menu on small screens, together with Photo view.

The menu offers Balanced, Lush, and Simple detail. Balanced and Lush use a depth-based ambient occlusion pass and multisample anti-aliasing when supported. Lush uses sharper shadows, stronger contact shading, and a higher pixel ratio. Simple disables cast shadows, contact shading, steam emission, bloom, and lagoon reflections and reduces pixel resolution for older devices. The renderer uses shared geometry, instanced facade details, foliage, floor tiles, and posed guests, cached static shadows, and a 30 fps rendering cap. Simulation remains independent of render timing. Performance depends on the browser, graphics device, and spa size.

If WebGL is unavailable, the original Canvas visuals activate automatically and the building game remains playable. If an active graphics context is lost, the game pauses and prompts you to save and refresh.

## Saves

Existing version-one spa saves remain compatible. Autosaving occurs every 25 simulation seconds and after building changes. The menu provides manual saving, JSON export/import, reload, and a confirmed reset. Guests restart their visits after loading, while layouts, cleanliness, visit counts, balance, and camera persist. Light and detail preferences are also remembered locally.

Browser storage for local HTML files varies. Export a backup before moving files or switching browsers. `Stillwater.html` may have a different storage origin from `index.html`; use Export and Import to transfer a saved spa between them.

## Development and verification

Edit `index.html` for gameplay and the interface, `engine.js` for the Babylon scene, camera, glTF integration, materials, lighting, effects, and native catalog thumbnails, `model-library.js` for modular facility geometry, or `architecture.js` for buildings and landscaping. Three.js is used solely as a geometry-authoring helper; Babylon owns the actual WebGL renderer, meshes, PBR materials, shadows, particles, and effects. `graphics.js` and `postprocess.js` are superseded implementations and are not loaded by the game.

Babylon.js and its glTF loader are vendored under Apache 2.0. The small geometry helper is MIT. Asset licenses, authors, source URLs, modifications, and SHA-256 hashes are in `assets/SOURCES.md`, the adjacent license files, and `assets/manifest.json`. The Credits menu also includes attribution. There are no runtime CDN or asset-server dependencies.

To replace an imported model, edit the local GLB and its entry in `tools/assets.cjs`, then run `node tools/assets.cjs`. `engine.js` fits imported models to facility footprints and retains their original glTF materials. `tools/bake-plants.py` is the original Blender source for the plants; optionally rebuild them using `blender --background --python tools/bake-plants.py`. Blender is only needed for asset editing. Rebuild the embedded data after changing assets.

Regenerate the standalone file after editing source:

```sh
node tools/package.cjs
python3 tools/download.py
```

The cloud runtime supplies Node, Python, Chromium, and Playwright. With the local server running, execute these browser checks sequentially:

```sh
node tests/smoke.cjs
node tests/graphics.cjs
node tests/retina.cjs
```

They exercise pavilion construction, island growth, roof cutaways, photo view, depth shading, building, collision handling, guest use and revenue, save/reload, refreshing and refunds, all detailed models, native glTF imports and foliage, geometric roof tiles, HDR lighting, engine steam particles, camera projection and picking at extreme zoom and on high-DPI displays, light/detail controls, mobile collection controls, transient GPU resource cleanup, offline standalone execution, and the no-WebGL fallback. The managed test browser blocks `file://` navigation, so offline tests load the bundled HTML into a browser context with networking disabled. This validates offline execution without claiming a direct local-file navigation test.

To regenerate the reference layout and all three screenshots with the server running, use `node tools/preview.cjs`. This validates the example through the game’s import checks and runs real guests before capture.

Use the existing checkout: cloud tasks are already isolated, so extra Git worktrees are unnecessary.
