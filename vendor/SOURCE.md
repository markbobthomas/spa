# Local Three.js distribution

- Package: `three@0.160.1` (Three.js revision 160).
- Official npm archive: `https://registry.npmjs.org/three/-/three-0.160.1.tgz`.
- Acquired using npm with normal TLS and package verification enabled.
- Archive SHA-512 was independently checked against npm registry metadata:
  `sha512-Bgl2wPJypDOZ1stAxwfWAcJ0WQf7QzlptsxkjYiURPz+n5k4RBDLsq+6f9Y75TYxn6aHLcWz+JNmwTOXWrQTBQ==`.
- Vendored `three.min.js` SHA-256:
  `170c6789f43217c96b3170f4b42fafe135de7f7cd48497a4218f9757ee1d49fa`.
- License: MIT, retained in `THREE-LICENSE.txt` and included in the standalone game.

The classic script build is intentional: it supports offline HTML opened directly, without module fetches or a CDN. No dependency install is required to play or edit the game.

## Babylon.js renderer and glTF loader

Babylon.js 9.29.0 and babylonjs-loaders 9.29.0 are downloaded from their official npm packages. SHA-512 integrity was verified against registry metadata, recorded in `babylonjs-source.json` and `babylonjs-loaders-source.json`. `babylon.js` is the full engine; `babylon.glTFFileLoader.min.js` provides native glTF loading and its material extensions. Apache 2.0 license text is included locally and in the standalone build.

These classic-script distributions run offline when opened directly. Babylon is the renderer; Three.js constructs geometry only. No npm install is needed to play.
