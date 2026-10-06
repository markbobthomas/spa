// Embed licensed glTF/HDR data for local file use and the standalone HTML.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),assets={},manifest={};
const files={chair:'velvet-chair.glb',sofa:'leather-sofa.glb',trees:'grass-trees.glb',pines:'grass-trees-tall.glb',olive:'olive-tree.glb',palm:'indoor-palm.glb',hdr:'garden-light.hdr'};
for(const [key,name]of Object.entries(files)){const data=fs.readFileSync(path.join(root,'assets',name));assets[key]={name,data:data.toString('base64')};manifest[name]={sha256:crypto.createHash('sha256').update(data).digest('hex'),size:data.length};}
fs.writeFileSync(path.join(root,'asset-data.js'),'/* Local licensed glTF and HDR assets; no asset server required. */\nwindow.STILLWATER_ASSETS='+JSON.stringify(assets)+';\n');
fs.writeFileSync(path.join(root,'assets/manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log('Embedded '+Object.keys(assets).length+' local engine assets.');
