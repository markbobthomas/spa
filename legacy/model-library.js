/* Mesh authoring library. Babylon.js renders these meshes; this file creates no graphics context. */
(()=>{'use strict';if(!window.THREE)return;
window.StillwaterModels={create(){
const T=window.THREE,scene=new T.Scene(),renderer={babylonAuthoring:true,capabilities:{getMaxAnisotropy:()=>8},shadowMap:{needsUpdate:false}};
const geometryCache=new Map(),materialCache=new Map(),textures={},templates=new Map(),animateWater=[],windUniforms=[];
let seed=923;const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return (seed>>>0)/4294967296};
  function texture(kind) {
    if(textures[kind]) return textures[kind];
    const c=document.createElement('canvas');c.width=c.height=512;const q=c.getContext('2d');
    q.fillStyle=kind==='wood'?'#eeeadf':kind==='fabric'?'#f2f0e9':kind==='stone'?'#f0f0e8':'#eff1e3';q.fillRect(0,0,512,512);
    for(let i=0;i<12000;i++){let v=Math.floor(noise()*100+130);q.fillStyle=`rgba(${v},${v},${v},${kind==='fabric'?.13:.06})`;q.fillRect(noise()*512,noise()*512,kind==='fabric'?1:2,kind==='fabric'?2:1)}
    if(kind==='wood') {
      for(let i=0;i<150;i++){let y=noise()*512;q.strokeStyle=`rgba(81,59,32,${.02+noise()*.12})`;q.lineWidth=.5+noise()*1.3;q.beginPath();q.moveTo(0,y);for(let x=0;x<=512;x+=16)q.lineTo(x,y+Math.sin(x*.021+i)*3+Math.sin(x*.006+i)*9);q.stroke()}
      for(let i=0;i<4;i++){q.strokeStyle='#77614a20';q.strokeRect(0,i*128,512,128)}
    } else if(kind==='fabric') {
      for(let i=0;i<512;i+=3){q.fillStyle='#7c755711';q.fillRect(i,0,1,512);q.fillRect(0,i,512,1)}
    } else if(kind==='stone') {
      for(let i=0;i<24;i++){q.beginPath();q.strokeStyle='#7b8c8220';q.lineWidth=.4+noise();let x=noise()*512;q.moveTo(x,0);for(let y=0;y<=512;y+=16){x+=(noise()-.5)*40;q.lineTo(x,y)}q.stroke()}
    } else {
      for(let i=0;i<120;i++){q.beginPath();q.strokeStyle='#a1af7d30';q.lineWidth=2;let x=noise()*512,y=noise()*512;q.moveTo(x,y);q.lineTo(x+noise()*4-2,y+noise()*5-2);q.stroke()}
    }
    const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures[kind]=map;return map;
  }
  function mat(color,kind='stone',extra={}) {
    const k=color+'|'+kind+'|'+JSON.stringify(extra);if(materialCache.has(k))return materialCache.get(k);
    const config={color,roughness:kind==='fabric'?.96:kind==='wood'?.55:kind==='metal'?.27:kind==='ceramic'?.23:.82,
      metalness:kind==='metal'?.75:0,envMapIntensity:kind==='metal'?.9:.18,...extra};
    if(['wood','stone','fabric'].includes(kind)){config.map=texture(kind);config.bumpMap=textures[kind];config.bumpScale=kind==='wood'?.035:kind==='stone'?.012:.02;}
    const m=new T.MeshPhysicalMaterial({...config,clearcoat:kind==='ceramic'?.6:kind==='wood'?.12:0});if(kind==='leaf'){const u={value:0};windUniforms.push(u);m.onBeforeCompile=shader=>{shader.uniforms.windTime=u;shader.vertexShader='uniform float windTime;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.x += sin(windTime*.8 + position.y*3.0)*.013*max(position.y,0.0);')}}m.userData.kind=kind;materialCache.set(k,m);return m;
  }
  function geom(key,make){if(!geometryCache.has(key))geometryCache.set(key,make());return geometryCache.get(key)}
  function rounded(w,h,d,r=.06){r=Math.min(r,w/2-.001,d/2-.001,h/3);return geom(`box:${w}:${h}:${d}:${r}`,()=>{
    const shape=new T.Shape();let x=-w/2,z=-d/2;
    shape.moveTo(x+r,z);shape.lineTo(x+w-r,z);shape.quadraticCurveTo(x+w,z,x+w,z+r);shape.lineTo(x+w,z+d-r);shape.quadraticCurveTo(x+w,z+d,x+w-r,z+d);shape.lineTo(x+r,z+d);shape.quadraticCurveTo(x,z+d,x,z+d-r);shape.lineTo(x,z+r);shape.quadraticCurveTo(x,z,x+r,z);
    const bevel=Math.min(.018,h*.15,r*.45),g=new T.ExtrudeGeometry(shape,{depth:h-bevel*2,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:2,steps:1,curveSegments:5});
    g.rotateX(-Math.PI/2);g.translate(0,-h/2+bevel,0);g.computeVertexNormals();return g;
  })}
  function mesh(g,geometry,material,x,y,z,sx=1,sy=1,sz=1){const m=new T.Mesh(geometry,material);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;g.add(m);return m}
  function box(g,x,z,w,d,y,h,color,kind='stone',r=.045){return mesh(g,rounded(w,h,d,r),typeof color==='string'?mat(color,kind):color,x+w/2,y+h/2,z+d/2)}
  function sphere(g,x,z,y,r,color,scale=[1,1,1],kind='leaf'){return mesh(g,geom('sphere',()=>new T.SphereGeometry(1,16,12)),mat(color,kind),x,y,z,r*scale[0],r*scale[1],r*scale[2])}
  function cylinder(g,x,z,y,r,h,color,kind='stone',top=r){return mesh(g,geom(`cyl:${r}:${top}:${h}`,()=>new T.CylinderGeometry(top,r,h,40)),typeof color==='string'?mat(color,kind):color,x,y+h/2,z)}
  function torus(g,x,z,y,r,t,color,scale=[1,1]){let m=mesh(g,geom(`torus:${r}:${t}`,()=>new T.TorusGeometry(r,t,10,64)),typeof color==='string'?mat(color,'ceramic'):color,x,y,z,scale[0],scale[1],1);m.rotation.x=-Math.PI/2;return m}
  function pipe(g,points,color,r=.025,kind='metal'){let curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(p[0],p[2],p[1])));return mesh(g, geom('pipe:'+JSON.stringify(points)+':'+r,()=>new T.TubeGeometry(curve,16,r,8,false)),mat(color,kind),0,0,0)}
  function label(g,text,x,z,y,width=.95){const c=document.createElement('canvas');c.width=512;c.height=128;const q=c.getContext('2d');q.fillStyle='#f5f1e1';q.fillRect(0,0,512,128);q.fillStyle='#465f4b';q.textAlign='center';q.font='500 44px Georgia';q.fillText(text,256,79);const map=new T.CanvasTexture(c);map.colorSpace=T.SRGBColorSpace;const material=new T.MeshBasicMaterial({map,side:T.DoubleSide});let m=new T.Mesh(new T.PlaneGeometry(width,width/4),material);m.position.set(x,y,z);g.add(m);return m}
  function water(g,x,z,y,w,d,oval=false,color='#65afa9'){
    const key=oval?`waterEllipse:${w}:${d}`:`waterRect:${w}:${d}`;
    const geometry=geom(key,()=>{let geo=oval?new T.CircleGeometry(1,80):new T.PlaneGeometry(w,d,24,24);geo.rotateX(-Math.PI/2);if(oval)geo.scale(w/2,1,d/2);return geo});
    const uniforms={time:{value:0}};
    const material=new T.MeshPhysicalMaterial({color:new T.Color(color).multiplyScalar(.78),roughness:.2,metalness:.06,clearcoat:.8,clearcoatRoughness:.13,transparent:true,opacity:.87,envMapIntensity:.6,side:T.DoubleSide});
    material.onBeforeCompile=shader=>{shader.uniforms.time=uniforms.time;shader.vertexShader='uniform float time;varying vec2 spaWaterPoint;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nspaWaterPoint=position.xz;transformed.y += sin(position.x * 5.0 + time) * cos(position.z * 4.0 - time * .7) * .012;');shader.fragmentShader='uniform float time;varying vec2 spaWaterPoint;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat spaCaustic=sin(spaWaterPoint.x*9.0+sin(spaWaterPoint.y*6.0+time*.3)) * sin(spaWaterPoint.y*11.0+sin(spaWaterPoint.x*7.0-time*.2));diffuseColor.rgb *= .94+.16*smoothstep(.65,.94,spaCaustic);').replace('#include <normal_fragment_begin>','#include <normal_fragment_begin>\nnormal = normalize(normal + vec3(sin(vViewPosition.x*8.0 + time)*.06, cos(vViewPosition.y*9.0-time)*.06,0.0));');};
    material.userData.kind='water';const m=mesh(g,geometry,material,x,y,z);m.castShadow=false;animateWater.push(uniforms);
    // Fine, expanding ripples above the reflective surface.
    for(let i=0;i<3;i++){let ring=torus(g,x,z,y+.028,.24+i*.26,.006,new T.MeshBasicMaterial({color:'#d3efe0',transparent:true,opacity:.2,depthWrite:false}));ring.userData.ripple={phase:i*.33,max:Math.min(w,d)*.4};}
    return m;
  }
  function pot(g,x,z,scale=1,color='#c0a48a'){
    cylinder(g,x,z,.03,.23*scale,.44*scale,color,'ceramic',.31*scale);torus(g,x,z,.47*scale,.3*scale,.025*scale,color);cylinder(g,x,z,.455*scale,.27*scale,.018,'#544b34','soil');
  }
  function leaf(g,x,z,y,length,angle,color='#6d8e55',pitch=.4){let m=sphere(g,x,z,y,1,color,[.08,length,.025]);m.rotation.z=pitch;m.rotation.y=angle;return m}
  function greenery(g,x,z,kind='tree',scale=1){const p=new T.Group();g.add(p);p.position.set(x,0,z);p.scale.setScalar(scale);pot(p,0,0);
    if(kind==='tree'){
      pipe(p,[[0,0,.45],[.015,0,1.2],[-.06,0,1.7]],'#87765a',.042,'wood');pipe(p,[[0,0,1],[-.32,.12,1.55]],'#87765a',.025,'wood');pipe(p,[[0,0,1.15],[.31,-.07,1.8]],'#87765a',.025,'wood');
      for(let i=0;i<44;i++){let a=i*2.399,r=.15+.25*noise(),y=1.35+noise()*.68;sphere(p,Math.cos(a)*r,Math.sin(a)*r,y,.12+.04*noise(),i%3?'#879969':'#a0af83',[1,.65,1]);leaf(p,Math.cos(a)*r,Math.sin(a)*r,y+.07,.12,a,'#b1bc90',.5)}
    }else if(kind==='palm'){
      pipe(p,[[0,0,.48],[.02,0,1.3],[0,0,1.65]],'#a18f62',.038,'wood');
      for(let i=0;i<8;i++){let a=i*Math.PI/4;const dx=Math.cos(a),dz=Math.sin(a);pipe(p,[[0,0,1.55],[dx*.3,dz*.3,1.75],[dx*.72,dz*.72,1.37]],'#779261',.012,'leaf');for(let j=1;j<=6;j++){let t=j/7,cx=dx*t*.73,cz=dz*t*.73,y=1.63+Math.sin(t*Math.PI)*.18-t*.27;for(let side of [-1,1]){let m=leaf(p,cx-dz*.11*side,cz+dx*.11*side,y,.17*(1-t*.5),a,'#66875a',side*.9);m.rotation.y=a}}}
    }else{
      for(let i=0;i<16;i++){let a=i*2.399,r=.1+.25*noise();leaf(p,Math.cos(a)*r,Math.sin(a)*r,.67+noise()*.15,.22,a,i%2?'#7f9b64':'#567951',.6)}
      if(kind==='flowers')for(let i=0;i<9;i++){let a=i*2.4,x=Math.cos(a)*.2,z=Math.sin(a)*.2,y=.92+noise()*.12;pipe(p,[[x,z,.55],[x,z,y]],'#798853',.008,'leaf');for(let j=0;j<5;j++)sphere(p,x+Math.cos(j*6.28/5)*.045,z+Math.sin(j*6.28/5)*.045,y,.047,i%2?'#e4a8a0':'#ead4a0',[1,.45,1],'fabric');sphere(p,x,z,y+.02,.024,'#dfb573')}
    }
    p.userData.sway=true;return p;
  }
  function cushion(g,x,z,w,d,y,h,color){return box(g,x,z,w,d,y,h,color,'fabric',.12)}
  function towel(g,x,z,y,color='#f3ebd8'){box(g,x,z,.4,.25,y,.065,color,'fabric');box(g,x+.025,z+.025,.35,.2,y+.064,.032,color,'fabric')}
  function tub(g,a){const r=a.w*.44,x=a.w/2,z=a.d/2,h=a.id==='plunge'?.67:.8,col=a.color;
    cylinder(g,x,z,.04,r,.09,'#7f7768','stone');
    // A lathed vessel is open inside, with a rounded rim and a real bowl wall.
    let points=[[0,0],[r-.07,0],[r,.12],[r,h-.09],[r-.035,h],[r-.16,h],[r-.19,h-.07],[r-.23,.2],[0,.2]].map(p=>new T.Vector2(...p));
    mesh(g,new T.LatheGeometry(points,80),mat(col,a.id==='onsen'?'wood':'stone'),x,.11,z);
    if(a.id==='onsen'){
      for(let i=0;i<36;i++){let t=i*6.28/36;let p=box(g,x+Math.cos(t)*(r-.02)-.018,z+Math.sin(t)*(r-.02)-.018,.025,.025,.18,h-.17,'#917049','wood',.003);p.rotation.y=-t;}
      for(let y of [.27,.66])torus(g,x,z,y,r+.008,.018,'#686b5c');
      box(g,x-.58,a.d-.34,1.16,.65,.03,.18,'#ba9870','wood');box(g,x-.58,a.d-.2,1.16,.42,.21,.18,'#b38d61','wood');
    }
    water(g,x,z,h-.025,r*1.66,r*1.66,true,a.water);pipe(g,[[a.w-.35,z,.5],[a.w-.35,z,1.02],[a.w-.63,z,1.02]],'#baa46e',.025);towel(g,.4,.25,h+.08);
    if(a.id==='onsen')g.userData.steam=true;
  }
  function bath(g,a){let x=a.w/2,z=a.d/2;const outer=a.w*.44,inner=outer*.75;let points=[[0,0],[outer*.7,0],[outer,.25],[outer,.61],[outer-.05,.7],[inner,.7],[inner,.62],[inner*.75,.19],[0,.19]].map(p=>new T.Vector2(...p));let m=mesh(g,new T.LatheGeometry(points,80),mat(a.color,a.id==='bath'?'ceramic':'stone'),x,.12,z);m.scale.z=a.d/a.w;water(g,x,z,.73,a.w*.63,a.d*.63,true,a.water);pipe(g,[[x,a.d-.2,.04],[x,a.d-.2,1.06],[x,a.d-.5,1.08]],'#bba574',.027);cylinder(g,x-.33,a.d-.17,.08,.07,.06,'#bba574','metal');cylinder(g,x+.33,a.d-.17,.08,.07,.06,'#bba574','metal');}
  function couch(g,a){const w=a.w,d=a.d,c=a.color;for(let x of [.2,w-.2])for(let z of [.18,d-.18])cylinder(g,x,z,.02,.05,.19,'#947756','wood');box(g,.08,.08,w-.16,d-.16,.16,.21,c,'fabric',.09);cushion(g,.08,.02,w-.16,.24,.35,.54,c);cushion(g,.04,.05,.25,d-.1,.3,.36,c);cushion(g,w-.29,.05,.25,d-.1,.3,.36,c);for(let i=0;i<w-1;i++)cushion(g,.31+i*(w-.62)/(w-1),.28,(w-.65)/(w-1),d-.36,.34,.19,c);let p=cushion(g,.35,.18,.4,.22,.53,.26,'#a7b58d');p.rotation.z=-.12;let blanket=box(g,w-.68,.33,.38,.55,.535,.025,'#c8ab8d','fabric',.02);blanket.rotation.y=.1;}
  function daybed(g,x,z,w=1,d=2,color='#b9c4a6'){for(let dx of [.12,w-.12])for(let dz of [.15,d-.15])box(g,x+dx,z+dz,.07,.07,.02,.24,'#9e825b','wood');box(g,x+.04,z+.06,w-.08,d-.12,.22,.12,'#c0a780','wood');cushion(g,x+.08,z+.10,w-.16,d-.2,.34,.16,color);cushion(g,x+.12,z+.15,w-.24,.4,.5,.15,'#eee5cf');towel(g,x+.23,z+d-.48,.51)}
  function room(g,a){const w=a.w,d=a.d,c=a.color,wood=a.id==='sauna';box(g,.025,.025,w-.05,d-.05,.01,.11,c,wood?'wood':'stone');
    const back=box(g,0,0,w,.11,.12,1.7,c,wood?'wood':'stone'),side=box(g,0,0,.11,d,.12,1.7,c,wood?'wood':'stone');back.userData.cutaway='back';side.userData.cutaway='left';
    box(g,w-.11,0,.11,d,.12,.2,c);box(g,0,d-.11,w,.11,.12,.2,c);
    box(g,.12,.13,w-.24,.04,1.6,.045,wood?'#edd2a2':'#edf2de',wood?'wood':'ceramic');
    if(wood){for(let i=0;i<9;i++)box(g,.12,.14,w-.24,.025,.2+i*.16,.012,'#9b7650','wood',.003);}
    else{for(let x=.5;x<w;x+=.5)box(g,x,.12,.008,.006,.14,1.55,'#e9eadd','stone',.001);for(let y=.4;y<1.6;y+=.35)box(g,.12,.12,w-.24,.01,y,.008,'#e9eadd','stone',.001);}
    if(a.id==='changing'){
      for(let i=0;i<3;i++){box(g,.16+i*.87,.16,.8,.5,.13,1.39,'#8c9b7b','wood');box(g,.2+i*.87,.67,.71,.04,.22,1.23,'#a3b18e','wood');cylinder(g,.76+i*.87,.715,.8,.028,.03,'#c2b282','metal');label(g,String(i+1).padStart(2,'0'),.53+i*.87,.715,1.22,.23)}box(g,.48,1.2,2.1,.48,.13,.35,'#b8a179','wood');towel(g,.7,1.23,.5);label(g,'EVERYONE',1.5,.13,1.45,1.1);
    }else if(a.id==='toilet'){
      box(g,.45,.23,.7,.31,.14,.82,'#f2f0e2','ceramic');cylinder(g,.8,.9,.14,.25,.31,'#f0eee1','ceramic');let bowl=sphere(g,.8,.96,.53,.39,'#f2f0e4',[1,.48,1.24],'ceramic');torus(g,.8,.96,.6,.28,.07,'#f6f2e4',[1,1.2]);cylinder(g,.8,.96,.56,.19,.018,'#a4bbb2','ceramic');box(g,1.39,.28,.48,.7,.12,.56,'#a1ae97','wood');sphere(g,1.63,.62,.72,.22,'#f3f0e5',[1,.24,1.3],'ceramic');pipe(g,[[1.65,.4,.75],[1.65,.4,.95],[1.65,.57,.95]],'#b9a577',.018);box(g,1.34,.13,.54,.06,.95,.65,'#b0d0c5','metal');label(g,'RESTROOM',1,.13,1.52,1.0);
    }else if(a.kind==='quiet'){
      daybed(g,.37,.55,1.25,2,'#d0c3a5');daybed(g,2.02,.55,1.25,2,'#adbba1');greenery(g,3.55,2.6,'palm',.65);label(g,'BREATHE',2,.13,1.4,1.1);
    }else{
      box(g,.19,.2,w-.42,.56,.14,.45,'#c5a479','wood');box(g,.19,.2,.56,d-.45,.14,.45,'#c5a479','wood');for(let i=0;i<4;i++){box(g,.2,.24+i*.1,w-.44,.035,.6,.018,'#ead1a2','wood',.003);box(g,.24+i*.1,.25,.035,d-.55,.6,.018,'#ead1a2','wood',.003)}towel(g,.85,.3,.64);
      cylinder(g,w-.6,d-.65,.15,.34,.47,'#677968','metal');for(let i=0;i<8;i++)sphere(g,w-.76+(i%3)*.13,d-.78+Math.floor(i/3)*.14,.67,.11,i%2?'#9aa08d':'#727f72',[1,.7,1]);label(g,wood?'WARMTH':'STEAM',w/2,.13,1.4,1);g.userData.steam=true;
    }
  }
  function counter(g,a){const w=a.w,c=a.color;box(g,.08,.06,w-.16,.82,.03,.89,c,'wood');for(let i=0;i<Math.floor(w*10);i++)box(g,.13+i*.095,.91,.025,.026,.1,.74,a.kind==='bar'?'#5e7763':'#a38258','wood',.002);box(g,.03,0,w-.06,1.02,.91,.095,'#dfd9c4','stone');box(g,.2,.18,w-.4,.025,1.014,.025,'#bba575','metal',.005);
    if(a.kind==='desk'){
      const screen=box(g,w-.8,.33,.47,.065,1.01,.35,'#3e5b50','metal');screen.rotation.x=-.14;box(g,w-.77,.405,.41,.012,1.05,.26,'#7a9e8d','ceramic');box(g,.35,.35,.43,.35,1.01,.025,'#f6f0dd','fabric');cylinder(g,.2,.25,1.015,.075,.11,'#c4b98b','ceramic');label(g,'STILLWATER',w/2,.94,.57,1.55);
    }else{
      box(g,.24,.24,.55,.45,1.01,.43,'#4e615a','metal');box(g,.27,.55,.49,.14,1.1,.21,'#b9b9a5','metal');for(let i=0;i<4;i++){cylinder(g,1.07+i*.34,.34,1.02,.065,.24,i%2?'#9fb482':'#c29e71','ceramic');cylinder(g,1.07+i*.34,.34,1.26,.035,.025,'#d5c99a','metal')}
      for(let i=0;i<w-1;i++){cylinder(g,.65+i,1.52,.02,.12,.53,'#aa8c62','wood');cylinder(g,.65+i,1.52,.57,.27,.08,a.kind==='bar'?'#879b7e':'#d3b58b','fabric');torus(g,.65+i,1.52,.21,.2,.014,'#b2a075')}
      cylinder(g,w-.45,.66,1.02,.11,.17,'#f5eedb','ceramic');pipe(g,[[w-.45,.66,1.19],[w-.37,.66,1.26],[w-.29,.66,1.19]],'#f5eedb',.018,'ceramic');label(g,a.kind==='bar'?'BOTANICALS':'TEA & COFFEE',w/2,.925,.55,1.55);
    }
  }
  function createModel(a){const g=new T.Group();g.userData.asset=a.id;
    switch(a.kind){
      case 'tub':tub(g,a);break;
      case 'bath':bath(g,a);break;
      case 'pool':{
        box(g,.03,.03,a.w-.06,a.d-.06,.01,.16,'#9ab1a5','stone');box(g,.03,.03,a.w-.06,.23,.17,.15,'#c2c5ac','stone');box(g,.03,a.d-.26,a.w-.06,.23,.17,.15,'#c2c5ac','stone');box(g,.03,.03,.23,a.d-.06,.17,.15,'#c2c5ac','stone');box(g,a.w-.26,.03,.23,a.d-.06,.17,.15,'#c2c5ac','stone');water(g,a.w/2,a.d/2,.325,a.w-.52,a.d-.52,false,a.water);for(let i=0;i<a.w;i++)for(let z of [.03,a.d-.26])box(g,i+.035,z,.93,.23,.32,.08,'#e4e0cb','stone');for(let j=0;j<a.d;j++)for(let x of [.03,a.w-.26])box(g,x,j+.035,.23,.93,.32,.08,'#e4e0cb','stone');for(let x of [.45,.85])pipe(g,[[x,.45,.18],[x,.45,.83],[x,.03,.88],[x,-.1,.49]],'#aeb7a3',.022);for(let z of [.17,.33])box(g,.44,z,.42,.035,.48,.035,'#aeb7a3','metal');break;}
      case 'ice':pot(g,.5,.5,.9,'#ba9066');cylinder(g,.5,.5,.07,.32,.6,'#a5835d','wood');torus(g,.5,.5,.69,.31,.025,'#c9b892');for(let i=0;i<7;i++){let ice=box(g,.3+noise()*.25,.3+noise()*.25,.13,.13,.6+noise()*.1,.1,'#d0ebef','ceramic');ice.rotation.y=noise()*3}pipe(g,[[.2,.5,.6],[.14,.5,.95],[.86,.5,.95],[.8,.5,.6]],'#aaae91',.018);break;
      case 'room':case 'quiet':room(g,a);break;
      case 'shower':{
        box(g,.04,.04,.92,1.92,.02,.12,'#d7decd','stone');box(g,.04,.04,.92,.1,.14,1.85,'#a7c1b4','ceramic');box(g,.05,.06,.08,1.5,.15,1.75,mat('#c2d7cf','glass',{transparent:true,opacity:.28,roughness:.12,depthWrite:false}));pipe(g,[[.5,.2,.18],[.5,.2,2.08],[.5,1,2.08]],'#baa878',.025);cylinder(g,.5,1,2.04,.26,.035,'#b7a474','metal');for(let i=0;i<16;i++){let x=.5+Math.cos(i*2.4)*.18,z=1+Math.sin(i*2.4)*.18;pipe(g,[[x,z,1.99],[x,z,.17]],'#b6ded8',.004,'water')}cylinder(g,.5,1,.15,.065,.01,'#929e8e','metal');break;}
      case 'desk':case 'bar':case 'cafe':counter(g,a);break;
      case 'sofa':couch(g,a);break;
      case 'lounger':daybed(g,0,0,1,2,a.color);break;
      case 'table':cylinder(g,1,1,.03,.13,.44,'#8b7555','wood');cylinder(g,1,1,.46,.82,.075,'#c4a882','wood');for(let i=0;i<2;i++){cylinder(g,.76+i*.48,.9+i*.1,.54,.11,.13,i?'#9db58d':'#eee4cc','ceramic');torus(g,.76+i*.48,.9+i*.1,.68,.085,.018,i?'#9db58d':'#eee4cc')}cylinder(g,1,1.25,.54,.18,.012,'#d7c398','ceramic');break;
      case 'rug':{
        box(g,.04,.04,a.w-.08,a.d-.08,.004,.027,a.color,'fabric',.09);for(let i=0;i<12;i++)box(g,.1,.17+i*.145,a.w-.2,.012,.033,.006,'#e7d9b7','fabric',.002);for(let i=0;i<24;i++)for(let z of [0,a.d-.02])box(g,.08+i*.118,z,.026,.08,.01,.014,'#d8c4a3','fabric',.002);break;}
      case 'tree':case 'palm':case 'flowers':greenery(g,.5,.5,a.kind);break;
      case 'planter':box(g,.04,.1,a.w-.08,.8,.03,.46,'#c7baa1','stone');box(g,.12,.18,a.w-.24,.64,.49,.015,'#5d6546','soil');for(let i=0;i<5;i++){const p=greenery(g,.3+i*.57,.5,'fern',.65);p.position.y=.18;}break;
      case 'bamboo':{
        box(g,.04,.12,a.w-.08,.76,.03,.27,'#c0b496','stone');box(g,.1,.18,a.w-.2,.64,.3,.014,'#5a6446','soil');for(let i=0;i<10;i++){let x=.2+i*.285,h=1.6+noise()*.4;cylinder(g,x,.5,.3,.025,h,'#b0b079','wood');for(let j=0;j<5;j++){let y=.55+j*.28;torus(g,x,.5,y,.028,.009,'#8e955d');leaf(g,x-.1,.5,y+.11,.18,i*2.4,'#789354',.9);leaf(g,x+.1,.55,y+.2,.18,i*2.4,'#96a974',-.8)}}break;}
      case 'fountain':{
        cylinder(g,1,1,.02,.84,.2,'#a7b09b','stone');water(g,1,1,.24,1.5,1.5,true);cylinder(g,1,1,.22,.24,.74,'#8c9d89','stone');cylinder(g,1,1,.96,.54,.1,'#b7c2ae','stone');water(g,1,1,1.075,.94,.94,true);pipe(g,[[1,1,1.08],[1,1,1.48],[1.05,1,1.08]],'#b5e2da',.032,'water');for(let i=0;i<8;i++){let a=i*.785;pipe(g,[[1+Math.cos(a)*.5,1+Math.sin(a)*.5,1.03],[1+Math.cos(a)*.63,1+Math.sin(a)*.63,.73],[1+Math.cos(a)*.64,1+Math.sin(a)*.64,.24]],'#b0d9c8',.012,'water')}break;}
      case 'lamp':{
        cylinder(g,.5,.5,.01,.23,.08,'#9c9f80','stone');cylinder(g,.5,.5,.09,.022,1.18,'#a69b70','metal');const lamp=sphere(g,.5,.5,1.27,.34,'#f2dfac',[1,1.14,1],'fabric');lamp.material=mat('#f2dfac','fabric',{emissive:'#f3b75e',emissiveIntensity:.22});for(let i=0;i<7;i++)torus(g,.5,.5,1.02+i*.078,Math.sqrt(Math.max(.005,.34*.34-Math.pow((i-3)*.075,2))),.004,'#c5b386');break;}
      case 'rocks':{
        box(g,.02,.02,a.w-.04,a.d-.04,.01,.12,'#a6b396','stone');box(g,.13,.13,a.w-.26,a.d-.26,.13,.018,'#e1d8b9','stone');for(let i=0;i<9;i++)pipe(g,[[.25,.25+i*.17,.155],[1.3,.3+i*.17,.155],[2.75,.25+i*.17,.155]],'#c9bfa3',.006,'sand');for(let i=0;i<3;i++){let x=.7+i*.74,z=.7+(i%2)*.6;sphere(g,x,z,.29,.27+i*.035,i%2?'#a0aa98':'#899c88',[1.1,.7,.85],'stone');sphere(g,x+.15,z-.05,.19,.22,'#7e925b',[1,.2,1],'leaf')}break;}
    }
    art?.dress(g,a);contact(g,a.w/2,a.d/2,a.w*1.15,a.d*1.15,a.cat==='garden'?.27:.35);return g;
  }
  function model(id){if(!templates.has(id)){let template=createModel(byId[id]);consolidate(template);templates.set(id,template)}return templates.get(id).clone(true)}
  function placeModel(g,o){g.rotation.y=-o.r*Math.PI/2;const a=byId[o.type];const offset=o.r===1?[a.d,0]:o.r===2?[a.w,a.d]:o.r===3?[0,a.w]:[0,0];g.position.set(o.x+offset[0],0,o.y+offset[1]);}
  const contactMap=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const q=c.getContext('2d'),r=q.createRadialGradient(64,64,5,64,64,64);r.addColorStop(0,'#1d302d80');r.addColorStop(.4,'#1d302d48');r.addColorStop(1,'#1d302d00');q.fillStyle=r;q.fillRect(0,0,128,128);return new T.CanvasTexture(c)})();
  function contact(g,x,z,w,d,opacity=.36){const m=new T.Mesh(geom('contact',()=>new T.PlaneGeometry(1,1)),new T.MeshBasicMaterial({map:contactMap,transparent:true,opacity,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));m.rotation.x=-Math.PI/2;m.position.set(x,.012,z);m.scale.set(w,d,1);g.add(m);return m}
  function consolidate(g){const movable=m=>{for(let p=m;p&&p!==g;p=p.parent)if(p.userData.roofRoot||p.userData.facadeSide||p.userData.pergola)return true;return false};g.updateMatrixWorld(true);const inverse=new T.Matrix4().copy(g.matrixWorld).invert(),buckets=new Map();g.traverse(m=>{if(m.isMesh&&!m.userData.ripple&&!m.userData.cutaway&&!m.material.transparent&&!movable(m)){let k=m.geometry.uuid+':'+m.material.uuid;if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(m)}});for(let nodes of buckets.values()){if(nodes.length<3)continue;const batch=new T.InstancedMesh(nodes[0].geometry,nodes[0].material,nodes.length);batch.castShadow=true;batch.receiveShadow=true;for(let i=0;i<nodes.length;i++){batch.setMatrixAt(i,new T.Matrix4().multiplyMatrices(inverse,nodes[i].matrixWorld));nodes[i].removeFromParent()}batch.instanceMatrix.needsUpdate=true;g.add(batch)}}
  const guestShadowMaterial=new T.MeshBasicMaterial({map:contactMap,transparent:true,opacity:.34,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  function guestModel(p){const g=new T.Group(),body=new T.Group();g.add(body);g.userData.body=body;
    const robe=mat(p.color,'fabric'),skin=mat(p.skin,'skin'),hair=mat(['#594636','#78634b','#4e4f40'][Math.floor(p.id*3)%3],'hair');
    mesh(body,rounded(.32,.36,.22,.07),robe,0,.49,0);box(body,-.16,-.14,.32,.3,.27,.08,p.color,'fabric');pipe(body,[[-.14,-.126,.38],[0,-.15,.38],[.14,-.126,.38]],'#e4d7b6',.016,'fabric');
    const head=mesh(body,geom('head',()=>new T.SphereGeometry(.123,20,16)),skin,0,.77,0,1,1.13,1);const cap=mesh(body,geom('hair',()=>new T.SphereGeometry(.126,16,12,0,Math.PI*2,0,Math.PI*.6)),hair,0,.79,0);cap.rotation.z=.08;
    for(let x of [-.041,.041])mesh(body,geom('eye',()=>new T.SphereGeometry(.009,8,6)),mat('#494d3f','eye'),x,.775,.115);
    const limbs=[];for(let side of [-1,1]){const leg=new T.Group();leg.position.set(side*.08,.29,0);body.add(leg);mesh(leg,rounded(.09,.22,.1,.025),skin,0,-.11,0);mesh(leg,rounded(.115,.05,.17,.025),mat('#cdc2a3','fabric'),0,-.24,.025);const arm=new T.Group();arm.position.set(side*.19,.61,0);body.add(arm);mesh(arm,rounded(.085,.18,.095,.025),robe,0,-.08,0);sphere(arm,0,0,-.19,.045,p.skin,[1,1,1],'skin');limbs.push({leg,arm,side})}g.userData.limbs=limbs;g.userData.head=head;g.traverse(m=>{if(m.isMesh)m.castShadow=false});const shadow=contact(g,0,0,.65,.55,.34);shadow.material.dispose();shadow.material=guestShadowMaterial;return g;
  }

const art=window.StillwaterArchitecture.create({scene,renderer,box,mesh,mat,geom,pipe,cylinder,consolidate});
return {renderer,art,model,placeModel,guestModel,box,mesh,mat,geom,pipe,cylinder,consolidate,contact,geometryCache,materialCache};
}};
})();
