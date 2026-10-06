const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),url=process.env.SPA_URL||'http://127.0.0.1:8012/';

async function run(){
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try{
  const context=await browser.newContext({viewport:{width:1000,height:750}});
  await context.addInitScript(()=>localStorage.setItem('stillwater-godot-visited','1'));
  const page=await context.newPage();const errors=[];const failures=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  page.on('response',r=>{if(r.status()>=400)failures.push(r.url()+' '+r.status())});
  await page.goto(url);await page.waitForFunction(()=>window.spaState?.ready,null,{timeout:120000});
  async function cmd(action,data={}){const before=await page.evaluate(([a,d])=>{let r=spaState.revision;spaCommand(a,d);return r},[action,data]);await page.waitForFunction(r=>spaState.revision>r,before,{timeout:90000});}
  await cmd('pause');await cmd('reset');
  assert.equal(await page.evaluate(()=>spaState.engine),'Godot 4.6.3');
  assert.equal(await page.evaluate(()=>spaState.catalog.length),38);
  assert.equal(await page.evaluate(()=>spaState.objects.length),9);
  await page.click('[data-tool="build"]');await page.waitForFunction(()=>spaState.tool==='build');
  await page.click('[data-asset="plunge"]');await page.waitForFunction(()=>spaState.chosen==='plunge');
  await cmd('inspect');
  async function floorPoint(x,z){return page.evaluate(([x,z])=>{const point=spaProjection.find(p=>p.x===x&&p.z===z).screen,r=document.querySelector('canvas').getBoundingClientRect();return {x:r.x+point[0]*r.width/spaState.viewport[0],y:r.y+point[1]*r.height/spaState.viewport[1]}},[x,z])}
  const point=await floorPoint(0,0);await page.mouse.click(point.x,point.y);
  await page.waitForFunction(()=>spaState.objects.some(o=>o.type==='plunge'),null,{timeout:60000});
  assert.equal(await page.evaluate(()=>spaState.objects.length),10,'Native mouse placement works through the HTML interface');
  await cmd('place',{id:'plunge',x:0,z:0});assert.equal(await page.evaluate(()=>spaState.objects.length),10,'Collision rejection preserves the layout');
  await cmd('budget');await cmd('place',{id:'onsen',x:0,z:-4});
  assert.equal(await page.evaluate(()=>spaState.money),11150,'Budget construction is charged');
  await cmd('tool',{tool:'explore'});
  await cmd('select',{id:11});await cmd('advance',{seconds:90});
  assert.ok(await page.evaluate(()=>spaState.visits>5&&spaState.earned>100),'Real Godot guest use and income');
  const uses=await page.evaluate(()=>spaState.objects.find(o=>o.id===11).uses);assert.ok(uses>0);
  await cmd('select',{id:11});const beforeClean=await page.evaluate(()=>spaState.money);await page.click('#refresh');
  await page.waitForFunction(m=>spaState.money===m-30,beforeClean,{timeout:60000});
  assert.equal(await page.evaluate(()=>spaState.objects.find(o=>o.id===11).clean),100);
  await cmd('save');const saved=await page.evaluate(()=>({count:spaState.objects.length,visits:spaState.visits,money:spaState.money}));
  await page.reload();await page.waitForFunction(()=>window.spaState?.ready,null,{timeout:120000});
  assert.deepEqual(await page.evaluate(()=>({count:spaState.objects.length,visits:spaState.visits,money:spaState.money})),saved,'Persistent browser storage restores the newest spa');
  await cmd('pause');await cmd('detail',{name:'simple'});
  await cmd('view',{zoom:.7,angle:1.6});assert.equal(await page.evaluate(()=>spaState.zoom),.7);
  await cmd('view',{zoom:450,angle:-2});assert.equal(await page.evaluate(()=>spaState.zoom),450);
  await cmd('home');await cmd('roofs');assert.equal(await page.evaluate(()=>spaState.roofs),true);
  await cmd('roofs');await cmd('floor',{style:'wood'});await cmd('paint',{x:6,z:0});assert.equal(await page.evaluate(()=>spaState.floors),118);
  await cmd('undo');assert.equal(await page.evaluate(()=>spaState.floors),117);
  await cmd('import',{save:{version:2,floors:[],objects:[]}});assert.equal(await page.evaluate(()=>spaState.objects.length),11);
  await page.setViewportSize({width:390,height:780});await cmd('home');
  assert.deepEqual(await page.evaluate(()=>spaState.viewport),[390,780],'The native viewport follows the mobile canvas');
  await page.click('[data-tool="build"]');await page.waitForFunction(()=>spaState.tool==='build');
  await page.click('[data-asset="bath"]');await page.waitForFunction(()=>spaState.chosen==='bath');
  assert.equal(await page.locator('#catalog-panel').isVisible(),false,'Mobile collection closes after choosing');
  await context.close();
  console.log('PASS: exported Godot engine, native mouse placement, collision, budget, real guest visits/income, refresh, persistent save/reload, camera limits, roof/floor controls, undo, malformed import, mobile sizing and collection.');

  // Check the real standalone bundle with all network requests blocked.
  const offline=await browser.newContext({viewport:{width:720,height:620},deviceScaleFactor:2});
  await offline.addInitScript(()=>localStorage.setItem('stillwater-godot-visited','1'));
  const op=await offline.newPage(),offlineErrors=[];op.on('pageerror',e=>offlineErrors.push(e.message));
  // Establish a normal storage origin before executing the exact standalone HTML.
  // No requests are allowed during the standalone engine's startup or gameplay.
  await op.goto(url+'credits.html');
  let network=0;await op.route('**/*',r=>{network++;return r.abort()});
  await op.setContent(fs.readFileSync(path.join(root,'Stillwater.html'),'utf8'),{waitUntil:'domcontentloaded',timeout:120000});
  await op.waitForFunction(()=>window.spaState?.ready,null,{timeout:150000});
  const initial=await op.evaluate(()=>spaState.objects.length);
  await op.evaluate(()=>{spaCommand('choose',{id:'plunge'});spaCommand('inspect')});
  await op.waitForFunction(()=>window.spaProjection&&spaState.chosen==='plunge',null,{timeout:90000});
  const pixel=await op.evaluate(()=>{const p=spaProjection.find(p=>p.x===0&&p.z===0),r=canvas.getBoundingClientRect();return {x:p.screen[0]*r.width/spaState.viewport[0],y:p.screen[1]*r.height/spaState.viewport[1]}});
  await op.mouse.click(pixel.x,pixel.y);
  await op.waitForFunction(n=>spaState.objects.length===n+1,initial,{timeout:90000});
  assert.equal(network,0,'The self-contained HTML runs with zero network requests');
  assert.equal(offlineErrors.length,0,offlineErrors.join('\n'));
  await offline.close();
  assert.deepEqual(errors,[],errors.join('\n'));assert.deepEqual(failures,[],failures.join('\n'));
  console.log('PASS: self-contained Godot HTML, all networking disabled, embedded assets/thumbnails/worklets, and high-DPI native placement.');
 }finally{await browser.close()}
}
run().catch(e=>{console.error(e);process.exitCode=1});
