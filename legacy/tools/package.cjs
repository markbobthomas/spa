// Produce a self-contained offline game from local, licensed source files.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
for (const file of ['vendor/three.min.js', 'vendor/babylon.js', 'vendor/babylon.glTFFileLoader.min.js', 'asset-data.js', 'architecture.js', 'model-library.js', 'engine.js']) {
  const source = fs.readFileSync(path.join(root, file), 'utf8').replace(/<\/script/gi, '<\\/script');
  html = html.replace(`<script src="${file}"></script>`, () => `<script>\n${source}\n</script>`);
}
const license = fs.readFileSync(path.join(root, 'vendor/THREE-LICENSE.txt'), 'utf8');
const engineLicense = fs.readFileSync(path.join(root, 'vendor/Apache-2.0.txt'), 'utf8');
const credits = fs.readFileSync(path.join(root, 'assets/SOURCES.md'), 'utf8');
html = html.replace('</head>', `<!-- Babylon.js and glTF loader, Apache 2.0.\n${engineLicense}\nThree.js geometry authoring helper, MIT.\n${license}\nAsset credits (also available in the game's Credits menu):\n${credits}\n-->\n</head>`);
if (/<script\s+src=/.test(html)) throw Error('Standalone build still contains an external script.');
fs.writeFileSync(path.join(root, 'Stillwater.html'), html);
console.log(`Built Stillwater.html (${Math.round(Buffer.byteLength(html)/1024)} KB), fully offline.`);
