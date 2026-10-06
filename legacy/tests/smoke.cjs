const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const openBrowsers=[];
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
 openBrowsers.push(browser);
 const page=await browser.newPage({viewport:{width:1280,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8000',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>window.spaGraphics?.ready,null,{timeout:150000});
 assert.equal(await page.evaluate(()=>spaGraphics.mode),'webgl');assert.equal(await page.evaluate(()=>spaGraphics.engine),'Babylon.js');console.log('Gameplay: startup');
 await page.evaluate(()=>{paused=true;window.requestAnimationFrame=()=>0});
 assert.equal(await page.locator('[data-asset]').count(),6);
 assert.equal(await page.evaluate(()=>stillwater.getState().objects.length),7);
 await page.screenshot({path:'/tmp/stillwater-start.png'});
 // Select a water feature, place it in the open half of the starting spa.
 await page.locator('[data-asset="onsen"]').click();
 const target=await page.evaluate(()=>project(.5,.5));
 await page.locator('#world').click({position:{x:target[0],y:target[1]}});
 assert.equal(await page.evaluate(()=>stillwater.getState().objects.filter(o=>o.type==='onsen').length),1);
 // A second overlapping placement must be rejected.
 await page.locator('#world').click({position:{x:target[0],y:target[1]}});
 assert.equal(await page.evaluate(()=>stillwater.getState().objects.filter(o=>o.type==='onsen').length),1);
 await page.locator('[data-tool="floor"]').click();
 const extra=await page.evaluate(()=>project(6.5,.5));
 await page.locator('#world').click({position:{x:extra[0],y:extra[1]}});
 assert.equal(await page.evaluate(()=>stillwater.getState().floors),131);
 await page.locator('#budget').click();
 assert.equal(await page.evaluate(()=>stillwater.getState().free),false);
 await page.locator('#speed').click(); await page.locator('#speed').click();
 // Advance the real simulation to exercise guest paths and facility use.
 await page.evaluate(()=>{paused=false;for(let i=0;i<2400;i++)simulate(.08);paused=true});
 let state=await page.evaluate(()=>stillwater.getState());
 assert(state.guests.length>0,'Guests should enter through reception');
 assert(state.objects.find(o=>o.type==='onsen').visits>0,'Guests should use the placed hot tub');
 assert(state.earned>0,'Facility visits should generate revenue');
 const render=await page.evaluate(()=>{draw(true);return spaGraphics.stats()});assert(render.calls<800,'Starter architecture must stay within its rendering budget: '+JSON.stringify(render));assert(render.guestDrawCalls<90,'Guests must draw in shared batches: '+JSON.stringify(render));console.log('Gameplay: guest use, revenue, and batched rendering');
 assert(state.guests.every(g=>Number.isFinite(g.x)&&Number.isFinite(g.y)));
 // Manual saving must survive a reload.
 await page.locator('#save').click();
 await page.reload({waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.spaGraphics?.ready,null,{timeout:150000});await page.evaluate(()=>{paused=true;window.requestAnimationFrame=()=>0});
 assert.equal(await page.evaluate(()=>stillwater.getState().floors),131);
 assert.equal(await page.evaluate(()=>stillwater.getState().objects.filter(o=>o.type==='onsen').length),1);
 await page.locator('#rotRight').click();await page.locator('#zoomIn').click();
 await page.screenshot({path:'/tmp/stillwater-built.png'});
 // Every asset must render at all four furnishing rotations and on every catalog tab.
 for(const tab of ['water','rooms','living','garden']) await page.locator(`[data-tab="${tab}"]`).click();
 assert.equal(await page.evaluate(()=>spaGraphics.testModels()),28);
 // Invalid imported data cannot alter the current spa.
 assert.equal(await page.evaluate(()=>{const before=JSON.stringify(snapshot());try{loadData({version:1,floors:[['0,0','spa']],objects:[],money:-1,dayTime:0})}catch{}return JSON.stringify(snapshot())===before}),true);
 // Inspection cleaning and removal use the same real controls as the player.
 await page.locator('[data-tool="inspect"]').click();
 const placed=await page.evaluate(()=>project(1.5,1.5,.7));
 await page.locator('#world').click({position:{x:placed[0],y:placed[1]}});
 await page.locator('#clean').click();
 assert((await page.evaluate(()=>stillwater.getState().objects.find(o=>o.type==='onsen').clean))>99);
 await page.locator('#sell').click();
 assert.equal(await page.evaluate(()=>stillwater.getState().objects.filter(o=>o.type==='onsen').length),0);
 // Mobile collection remains usable with the native 3D renderer.
 assert.equal(errors.length,0,errors.join('\n'));
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);assert.equal(await page.locator('.side').isVisible(),false);await page.locator('[data-tool="build"]').click();assert.equal(await page.locator('.side').isVisible(),true);await page.locator('[data-tab="water"]').click();await page.locator('[data-asset="onsen"]').click();assert.equal(await page.locator('.side').isVisible(),false);await page.screenshot({path:'/tmp/stillwater-mobile.png'});
 await browser.close();console.log('PASS: startup, thumbnails, placement, collision, floor expansion, budget toggle, guest use, revenue, save/reload, camera, all assets and rotations, invalid import protection, cleaning/refunds, mobile collection controls.');
})().catch(async e=>{console.error(e);await Promise.allSettled(openBrowsers.map(b=>b.close()));process.exit(1)});
