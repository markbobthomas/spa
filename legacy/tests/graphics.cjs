const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const openBrowsers=[];
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
 openBrowsers.push(browser);
 const page=await browser.newPage({viewport:{width:960,height:700}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto('http://127.0.0.1:8000',{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.spaGraphics?.ready,null,{timeout:150000});assert.equal(await page.evaluate(()=>spaGraphics.engine),'Babylon.js');assert.equal(await page.evaluate(()=>spaGraphics.scene.getClassName()),'Scene');assert.equal(await page.evaluate(()=>spaGraphics.stats().importedAssets),6);assert(await page.evaluate(()=>spaGraphics.scene.lights.find(l=>l.getClassName()==='DirectionalLight').getShadowGenerator().getShadowMap().renderList.every(m=>m.getTotalVertices()>0&&Array.isArray(m.subMeshes))));console.log('Graphics: startup');
 // Explicitly render each test state so software GPUs do not queue unrelated animated frames.
 await page.evaluate(()=>{paused=true;window.requestAnimationFrame=()=>0});await page.waitForTimeout(50);
 // The island follows painted tiles, and pavilion tiles create architecture immediately.
 const starter=await page.evaluate(()=>spaGraphics.artStats());assert.equal(starter.tiles,130);assert.equal(starter.buildings,1);assert(starter.shoreTiles>starter.tiles);
 await page.locator('[data-tool="floor"]').click();await page.locator('[data-floor="lobby"]').click();
 const extension=await page.evaluate(()=>project(6.5,.5));await page.locator('#world').click({position:{x:extension[0],y:extension[1]}});
 const extended=await page.evaluate(()=>{draw(true);return {floor:floors.get('6,0'),art:spaGraphics.artStats()}});assert.equal(extended.floor,'lobby');assert.equal(extended.art.tiles,131);assert(extended.art.buildings>starter.buildings);assert(extended.art.shoreTiles>starter.shoreTiles);
 await page.locator('[data-tool="inspect"]').click();
 // Full roofs, camera-aware cutaways, and automatic open roofs while furnishing.
 const roofState=()=>{let roofs=[];spaGraphics.sourceScene.traverse(o=>{if(o.userData.roofSide)roofs.push(o.visible)});return roofs};
 await page.evaluate(()=>{spaGraphics.setRoofMode('full');draw(true)});assert((await page.evaluate(roofState)).every(Boolean));
 await page.evaluate(()=>{spaGraphics.setRoofMode('cutaway');draw(true)});const cut=await page.evaluate(roofState);assert(cut.some(Boolean)&&cut.some(v=>!v));
 await page.evaluate(()=>{spaGraphics.setRoofMode('none');draw(true)});assert((await page.evaluate(roofState)).every(v=>!v));
 await page.evaluate(()=>{spaGraphics.setRoofMode('full');setTool('build');draw(true)});assert((await page.evaluate(roofState)).every(v=>!v));
 await page.evaluate(()=>{setTool('inspect');spaGraphics.setRoofMode('cutaway');reset();paused=true;draw(true)});
 assert.equal(await page.evaluate(()=>spaGraphics.postStats().depthShading),true);
 await page.keyboard.press('p');assert.equal(await page.locator('.topbar').isVisible(),false);await page.locator('#exitPhoto').click();assert.equal(await page.locator('.topbar').isVisible(),true);console.log('Graphics: tile architecture, island growth, cutaways, photo view, and depth shading');
 // Projection and inverse picking stay aligned across extreme zooms and viewing angles.
 assert.equal(await page.evaluate(()=>{setTool('build');const saved={...camera};let good=true;for(let angle of [-3,-2,-1,0,1,2,3])for(let tilt of [.25,.62,.9])for(let zoom of [3,43,2000]){Object.assign(camera,{angle,tilt,zoom,x:33,y:-17});for(let [x,y] of [[.5,.5],[-6.5,-4.5],[5.5,4.5]]){let hit=unproject(...project(x,y));if(hit.x!==Math.floor(x)||hit.y!==Math.floor(y))good=false}}Object.assign(camera,saved);setTool('inspect');return good}),true);
 // Real source thumbnails contain image data and render every model.
 for(const tab of ['water','rooms','living','garden']){await page.locator(`[data-tab="${tab}"]`).click();await page.waitForFunction(()=>spaGraphics.catalogReady(),null,{timeout:90000});assert(await page.evaluate(()=>Array.from(document.querySelectorAll('[data-thumb]')).every(c=>{let p=c.getContext('2d').getImageData(0,0,240,136).data;return p.some((v,i)=>i%4===3&&v>0)})))}
 assert.equal(await page.evaluate(()=>spaGraphics.testModels()),28);console.log('Graphics: camera and models');
 // Build the complete collection in a connected test layout, preserving the saved data format.
 await page.evaluate(()=>{floors.clear();objects=[];people=[];for(let x=-19;x<18;x++)for(let y=-14;y<17;y++)floors.set(key(x,y),x<0?'lobby':'spa');assets.forEach((a,i)=>create(a.id,-18+(i%7)*5,-13+Math.floor(i/7)*7,i%4));camera.zoom=22;camera.x=0;camera.y=0;paused=true;setTool('inspect');draw(true)});
 assert(await page.evaluate(()=>spaGraphics.scene.meshes.some(m=>m.metadata?.importedAsset==='sofa'&&m.getTotalVertices()>1000)));assert(await page.evaluate(()=>spaGraphics.scene.meshes.some(m=>m.metadata?.importedAsset==='palm')));assert(await page.evaluate(()=>spaGraphics.scene.meshes.some(m=>m.metadata?.roofTiles&&m.thinInstanceCount>20)));assert(await page.evaluate(()=>spaGraphics.scene.environmentTexture?.isReady()));assert(await page.evaluate(()=>spaGraphics.scene.particleSystems.length>=3));console.log('Graphics: full collection, glTF furniture, baked foliage, geometric tiles, HDR light, engine steam');await page.waitForTimeout(300);await page.screenshot({path:'/tmp/stillwater-collection.png'});
 // Quality and light controls must switch without context errors, and the camera must keep working.
 for(const q of ['lush','simple','balanced']){await page.evaluate(q=>{spaGraphics.setQuality(q);draw(true)},q);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>spaGraphics.quality),q)}
 for(const light of ['golden','evening','morning']){await page.evaluate(l=>{spaGraphics.setTheme(l);draw(true)},light);await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>spaGraphics.theme),light)}
 // Transient placement outlines must release their GPU geometries as the cursor moves.
 const memory=await page.evaluate(()=>{reset();paused=true;draw();setTool('build');selectedAsset='onsen';for(let i=0;i<12;i++){hover={x:i%15,y:Math.floor(i/15)};draw(true)}const start=spaGraphics.stats().geometries;for(let i=0;i<18;i++){hover={x:i%15,y:5+Math.floor(i/15)};draw(true)}return {start,end:spaGraphics.stats().geometries}});
 assert(memory.end<=memory.start+3,`Transient geometry leaked: ${JSON.stringify(memory)}`);
 assert.equal(errors.length,0,errors.join('\n'));await page.close();console.log('Graphics: rendering and resource checks passed');
 await browser.close();
 // Offline standalone WebGL and a genuine no-WebGL fallback both run without network assets.
 const offlineBrowser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});openBrowsers.push(offlineBrowser);
 const offline=await offlineBrowser.newContext({offline:true,viewport:{width:390,height:844}});const standalone=await offline.newPage();let requests=0;standalone.on('request',r=>{if(!/^(data|blob):/.test(r.url()))requests++});const standaloneErrors=[];standalone.on('pageerror',e=>standaloneErrors.push(e.message));standalone.on('console',m=>{if(m.type()==='error')standaloneErrors.push(m.text())});await standalone.setContent(fs.readFileSync('/workspace/spa/Stillwater.html','utf8'),{waitUntil:'domcontentloaded',timeout:120000});await standalone.waitForFunction(()=>window.spaGraphics?.ready,null,{timeout:150000});assert.equal(await standalone.evaluate(()=>spaGraphics.stats().importedAssets),6);assert.equal(await standalone.evaluate(()=>spaGraphics.engine),'Babylon.js');assert.equal(requests,0);assert.equal(standaloneErrors.length,0,standaloneErrors.join('\n'));assert.equal(await standalone.evaluate(()=>spaGraphics.testModels()),28);
 await offlineBrowser.close();
 const fallbackBrowser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--disable-webgl']});openBrowsers.push(fallbackBrowser);const fallback=await fallbackBrowser.newPage();const fallbackErrors=[];fallback.on('pageerror',e=>fallbackErrors.push(e.message));await fallback.goto('http://127.0.0.1:8000',{waitUntil:'domcontentloaded',timeout:120000});await fallback.waitForFunction(()=>window.spaGraphics?.mode==='canvas');await fallback.locator('[data-asset="onsen"]').click();const point=await fallback.evaluate(()=>project(.5,.5));await fallback.locator('#world').click({position:{x:point[0],y:point[1]}});assert.equal(await fallback.evaluate(()=>stillwater.getState().objects.filter(o=>o.type==='onsen').length),1);assert.equal(fallbackErrors.length,0);await fallbackBrowser.close();
 console.log('PASS: tile-derived island and pavilion construction, roof/cutaway controls, photo view, depth shading, WebGL, all 28 detailed models, extreme camera projection/picking, populated scene, lighting/detail controls, bounded cursor GPU memory, zero-network standalone HTML, playable no-WebGL fallback.');
})().catch(async e=>{console.error(e);await Promise.allSettled(openBrowsers.map(b=>b.close()));process.exit(1)});
