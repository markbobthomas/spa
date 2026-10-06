// Render the real Godot models, not illustrations, for the collection and previews.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const url=process.env.SPA_URL||'http://127.0.0.1:8011/';
async function main(){
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:320,height:320}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errors.push(m.text())});
  await page.addInitScript(()=>localStorage.setItem('stillwater-godot-visited','1'));
  await page.goto(url);await page.waitForFunction(()=>window.spaState?.ready,null,{timeout:120000});
  async function command(action,data={}){const revision=await page.evaluate(([action,data])=>{const r=spaState.revision;spaCommand(action,data);return r},[action,data]);await page.waitForFunction(r=>spaState.revision>r,revision,{timeout:90000});await page.waitForTimeout(150)}
  await command('pause');
  await page.evaluate(()=>document.querySelectorAll('body > *:not(canvas):not(script)').forEach(n=>n.style.setProperty('display','none','important')));
  const only=process.argv.find(a=>a.startsWith('--only='))?.slice(7).split(',');
  const catalog=(await page.evaluate(()=>spaState.catalog)).filter(a=>!only||only.includes(a.id));
  const out=path.join(root,'web/thumbnails');fs.mkdirSync(out,{recursive:true});
  for(const item of catalog){
   await command('thumbnail',{id:item.id});
   await page.screenshot({path:path.join(out,item.id+'.png'),clip:{x:15,y:15,width:290,height:290}});
   console.log('Native thumbnail: '+item.name);
  }
  await command('gallery_end');await command('example');await command('advance',{seconds:100});
  await page.setViewportSize({width:1600,height:1100});await command('view',{zoom:36,angle:.73,elevation:.8});
  await page.screenshot({path:path.join(root,'preview.png')});
  await command('roofs');await page.screenshot({path:path.join(root,'preview-roofs.png')});
  await command('roofs');await command('view',{zoom:15,angle:.73,elevation:.73,x:2,y:1,z:0});
  await page.screenshot({path:path.join(root,'preview-detail.png')});
  if(errors.length)throw Error(errors.join('\n'));
  console.log(catalog.length+' real-model thumbnails and three Godot previews captured.');
 }finally{await browser.close()}
}
main().catch(e=>{console.error(e);process.exitCode=1});
