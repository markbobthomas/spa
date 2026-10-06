// Capture a playable example using the same tiles, assets, and simulation as the game.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1080}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.goto('http://127.0.0.1:8000',{waitUntil:'domcontentloaded',timeout:120000});await page.waitForFunction(()=>window.spaGraphics?.ready,null,{timeout:150000});
  await page.evaluate(()=>{paused=true;window.requestAnimationFrame=()=>0});await page.waitForTimeout(50);
  const data=await page.evaluate(()=>{
   floors.clear();objects=[];people=[];nextId=1;
   for(let x=-10;x<=11;x++)for(let y=-7;y<=8;y++)floors.set(key(x,y),x<=-5&&y>=-6&&y<=5?'lobby':'spa');
   const layout=[['cashier',-9,-5],['cafe',-9,-2],['sofa',-9,2],['table',-6,2],['plant',-10,-6],['palm',-5,5],['flowers',-6,-4],['pool',-3,-6],['onsen',-3,-2],['steam',1,-3],['sauna',5,-4],['quiet',1,4],['bath',9,0],['stonebath',5,0],['plunge',1,0],['changing',9,-4],['toilet',9,6],['shower',11,3],['bar',-3,5],['fountain',-3,2],['rocks',5,5],['planter',-3,8],['bamboo',5,3],['lounger',0,1],['ice',4,-1],['plant',4,0],['plant',8,-6],['lantern',-4,1],['lantern',4,3],['flowers',8,8],['plant',5,8],['lantern',8,3],['palm',-4,-6],['flowers',0,4],['plant',11,-6],['lantern',-9,5]];
   for(let [type,x,y] of layout){if(!canPlace({type,x,y,r:0}))throw Error('Invalid example footprint: '+type+' '+x+','+y);create(type,x,y);}
   camera={angle:-Math.PI/4,tilt:.72,zoom:35,x:-36,y:-55};money=12000;earned=0;free=true;dayTime=540;speed=1;spawnClock=0;saveClock=0;
   // Import validation also checks every footprint and the portable save format.
   loadData(snapshot());paused=false;for(let i=0;i<2100;i++)simulate(.08);paused=true;
   setTool('inspect');hover=null;document.body.classList.add('photo-mode');spaGraphics.setQuality('lush');spaGraphics.setTheme('morning');spaGraphics.setRoofMode('full');draw(true);
   return snapshot();
  });
  fs.mkdirSync(path.join(root,'examples'),{recursive:true});fs.writeFileSync(path.join(root,'examples/island-retreat.json'),JSON.stringify(data,null,2)+'\n');
  await page.evaluate(async()=>{await spaGraphics.scene.whenReadyAsync();const shadow=spaGraphics.scene.lights.find(l=>l.getClassName()==='DirectionalLight').getShadowGenerator();await shadow.forceCompilationAsync({useInstances:true});shadow.getShadowMap().resetRefreshCounter();for(let i=0;i<3;i++)draw(true)});
  await page.screenshot({path:path.join(root,'preview.png'),style:'.photo-exit{display:none!important}'});
  await page.evaluate(()=>{spaGraphics.setRoofMode('cutaway');for(let i=0;i<3;i++)draw(true)});
  await page.screenshot({path:path.join(root,'preview-cutaway.png'),style:'.photo-exit{display:none!important}'});
  await page.evaluate(()=>{camera.zoom=100;camera.tilt=.68;camera.x=camera.y=0;const p=project(-5.5,1,.6);camera.x+=W/2-p[0];camera.y+=H*.57-p[1];for(let i=0;i<3;i++)draw(true)});
  await page.screenshot({path:path.join(root,'preview-detail.png'),style:'.photo-exit{display:none!important}'});
  const result=await page.evaluate(()=>({objects:objects.length,guests:people.length,earned,art:spaGraphics.artStats(),render:spaGraphics.stats()}));
  if(errors.length)throw Error(errors.join('\n'));console.log(JSON.stringify(result));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
