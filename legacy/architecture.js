/* Stillwater art kit: tile-derived shorelines, joined facades and authored roof profiles.
 * All meshes, atlas textures and landscaping stay local to the game. */
(() => {
'use strict';
const T=window.THREE;
if(!T)return;
window.StillwaterArchitecture={create({scene,renderer,box,mesh,mat,geom,pipe,cylinder,consolidate}){
  const world=new T.Group();world.name='The island and its architecture';scene.add(world);
  const buildings=new T.Group(),land=new T.Group();world.add(land,buildings);
  const cache=new Map(),materials=new Map();let tileCount=0,shoreCount=0,roofMode='cutaway',layoutKey='',bounds={x:0,z:0,w:20,d:18},time=0;
  const geo=(k,fn)=>{if(!cache.has(k))cache.set(k,fn());return cache.get(k)};
  function material(c,kind='plaster'){
    const k=c+kind;if(materials.has(k))return materials.get(k);
    const m=new T.MeshStandardMaterial({color:c,roughness:kind==='roof'?.78:kind==='leaf'?.95:.84,metalness:0,envMapIntensity:.12,flatShading:kind==='rock'});
    if(kind==='roof'){m.map=roofAtlas;m.bumpMap=roofAtlas;m.bumpScale=.045;}
    m.userData.kind=kind;materials.set(k,m);return m;
  }
  const atlas=document.createElement('canvas');atlas.width=atlas.height=512;const ac=atlas.getContext('2d');ac.fillStyle='#f7f2e8';ac.fillRect(0,0,512,512);
  for(let y=-32;y<544;y+=32)for(let x=-32;x<544;x+=32){const dx=x+(y%64?16:0);ac.fillStyle='#ba987745';ac.fillRect(dx,y+25,32,7);ac.strokeStyle='#8b705333';ac.lineWidth=2;ac.beginPath();ac.moveTo(dx+2,y);ac.lineTo(dx+2,y+29);ac.quadraticCurveTo(dx+16,y+34,dx+30,y+29);ac.lineTo(dx+30,y);ac.stroke();ac.strokeStyle='#ffffffaa';ac.beginPath();ac.moveTo(dx+6,y+3);ac.lineTo(dx+6,y+25);ac.stroke()}
  const roofAtlas=new T.CanvasTexture(atlas);roofAtlas.colorSpace=T.SRGBColorSpace;roofAtlas.wrapS=roofAtlas.wrapT=T.RepeatWrapping;roofAtlas.anisotropy=4;
  function solid(g,geometry,m,x=0,y=0,z=0,sx=1,sy=1,sz=1){return mesh(g,geometry,m,x,y,z,sx,sy,sz)}
  const hash=(x,z,s=0)=>{let n=Math.imul((Math.floor(x*17)+s*71)|0,374761393)^Math.imul(Math.floor(z*17)|0,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296};
  function archGeometry(w,h,gap,depth=.15){return geo(`arch:${w}:${h}:${gap}:${depth}`,()=>{const s=new T.Shape(),r=gap/2,c=w/2,spring=h-r-.25;s.moveTo(0,0);s.lineTo(c-r,0);s.lineTo(c-r,spring);s.absarc(c,spring,r,Math.PI,0,true);s.lineTo(c+r,0);s.lineTo(w,0);s.lineTo(w,h);s.lineTo(0,h);s.closePath();return new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSize:.025,bevelThickness:.02,bevelSegments:2,curveSegments:14})})}
  function archPanel(g,w=2,h=2.25,color='#edc9a2',glass=false){const part=new T.Group();g.add(part);
    const opening=w*.72,frame=solid(part,archGeometry(w,h,opening),material(color));frame.userData.archWall=true;
    const r=opening/2,spring=h-r-.25,points=[];for(let i=0;i<=22;i++){let a=Math.PI-i*Math.PI/22;points.push([w/2+Math.cos(a)*r,.19,spring+Math.sin(a)*r])}
    pipe(part,[[w/2-r,.19,.18],[w/2-r,.19,spring],...points,[w/2+r,.19,.18]],'#f5dec2',.045,'stone');
    box(part,.02,.15,.15,.2,0,h,'#f1d8b8','stone',.025);box(part,w-.17,.15,.15,.2,0,h,'#f1d8b8','stone',.025);
    box(part,0,-.015,w,.24,h-.04,.12,'#f5dfc5','stone');box(part,0,-.01,w,.21,.025,.1,'#c6a888','stone');
    if(glass){const s=new T.Shape();s.moveTo(w/2-r+.07,.45);s.lineTo(w/2-r+.07,spring);s.absarc(w/2,spring,r-.07,Math.PI,0,true);s.lineTo(w/2+r-.07,.45);s.closePath();const pane=solid(part,new T.ShapeGeometry(s,16),new T.MeshPhysicalMaterial({color:'#81b8b7',metalness:.15,roughness:.19,transparent:true,opacity:.75,envMapIntensity:.7,side:T.DoubleSide}),0,0,.06);pane.userData.ownedGeometry=true;pane.userData.ownedMaterial=true;
      box(part,w/2-.025,.2,.05,.04,.45,h-.58,'#4b7e79','wood',.01);box(part,w/2-r,.2,opening,.04,spring-.05,.05,'#4b7e79','wood',.01);box(part,w/2-r-.06,-.11,opening+.12,.42,.35,.11,'#e6c4a0','stone');
      for(let i=0;i<5;i++){const a=i*1.4;leafMass(part,w/2-r+.18+i*opening/5,.8,.35+Math.sin(a)*.1,.14,['#648f66','#91b378','#82a46f'][i%3],[1,.6,1]);}
      box(part,w/2-r-.01,-.15,opening+.02,.31,.44,.15,'#b87e65','ceramic');
    }
    return part;
  }
  function roof(g,w,d,y,color='#c87f72',rise=1.1){const roofRoot=new T.Group();roofRoot.position.y=y;roofRoot.userData.roofRoot=true;g.add(roofRoot);
    const extent=w/2+.32,length=d+.52,profile=[[-extent,-.06],[-extent+.16,.005],[-w*.35,.24],[-w*.2,rise*.64],[0,rise],[w*.2,rise*.64],[w*.35,.24],[extent-.16,.005],[extent,-.06]];
    for(let side of [-1,1]){const slice=side<0?profile.slice(0,5):profile.slice(4);const geometry=geo(`roof:${w}:${d}:${rise}:${side}`,()=>{const pos=[],uv=[],ids=[];for(let j=0;j<slice.length;j++)for(let k=0;k<2;k++){pos.push(slice[j][0]+w/2,slice[j][1],k?d+.26:-.26);uv.push((slice[j][0]+extent)/(extent*2),k?1:0)}for(let j=0;j<slice.length-1;j++){let a=j*2;ids.push(a,a+1,a+2,a+1,a+3,a+2)}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(ids);geo.computeVertexNormals();return geo});
      const m=solid(roofRoot,geometry,material(color,'roof'));m.material.side=T.DoubleSide;m.userData.roofSide=side;
      const eave=box(roofRoot,side<0?-.3:w-.04,-.28,.36,d+.56,-.08,.10,'#657c73','wood',.015);eave.userData.roofSide=side;
      const trim=pipe(roofRoot,slice.map(p=>[p[0]+w/2,-.27,p[1]+.03]),'#e4baa0',.025,'stone');trim.userData.roofSide=side;
      const trim2=pipe(roofRoot,slice.map(p=>[p[0]+w/2,d+.27,p[1]+.03]),'#e4baa0',.025,'stone');trim2.userData.roofSide=side;
    }
    const ridge=pipe(roofRoot,[[w/2,-.3,rise+.035],[w/2,d+.3,rise+.035]],'#9a6258',.065,'ceramic');ridge.userData.roofRidge=true;
    for(let z of [0,d]){const s=new T.Shape();s.moveTo(.02,0);s.lineTo(w-.02,0);for(let i=profile.length-2;i>0;i--)s.lineTo(profile[i][0]+w/2,profile[i][1]-.01);s.closePath();const p=solid(roofRoot,geo(`gable:${w}:${rise}`,()=>new T.ExtrudeGeometry(s,{depth:.09,bevelEnabled:false})),material('#e5c6a0'),0,0,z);p.userData.gableEnd=z===0?-1:1;
      pipe(roofRoot,[[.12,z,.025],[w/2,z,rise-.03],[w-.12,z,.025]],'#789082',.025,'wood').userData.gableEnd=z===0?-1:1;
    }
    return roofRoot;
  }
  function bathhouseDome(g,w,d){
    const r=Math.min(w,d)*.46,top=new T.Group();top.position.set(w/2,2.18,d/2);top.userData.roofRoot=true;g.add(top);
    for(let z of [-.08,d-.08])box(g,-.08,z,w+.16,.16,2.06,.16,'#e9d5b8','stone');
    for(let x of [-.08,w-.08])box(g,x,.08,.16,d-.16,2.06,.16,'#e9d5b8','stone');
    for(let side of [-1,1]){
      const m=solid(top,geo(`dome:${r}:${side}`,()=>new T.SphereGeometry(r,48,24,side<0?-Math.PI/2:Math.PI/2,Math.PI,0,Math.PI/2)),material('#7ea9a6','roof'));
      m.material.side=T.DoubleSide;m.userData.roofSide=side;
      const ring=solid(top,geo(`domeRing:${r}:${side}`,()=>new T.TorusGeometry(r,.055,8,48,Math.PI)),material('#b6c8b3'));
      ring.rotation.x=Math.PI/2;ring.rotation.z=side<0?Math.PI/2:-Math.PI/2;ring.userData.roofSide=side;
    }
    const finial=new T.Group();top.add(finial);finial.userData.roofRidge=true;
    cylinder(finial,0,0,r-.025,.027,.26,'#b49b64','metal');
    solid(finial,geo('finial',()=>new T.SphereGeometry(.075,16,12)),mat('#c3ab72','metal'),0,r+.2,0,1,1.3,1);
  }
  function crownGeometry(){return geo('leafCrown',()=>{const g=new T.IcosahedronGeometry(1,3);let p=g.attributes.position,normal=g.attributes.normal;for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i);const a=Math.atan2(v.z,v.x),n=1+.038*Math.sin(a*7+v.y*9)+.028*Math.cos(a*11-v.y*5);v.multiplyScalar(n);p.setXYZ(i,v.x,v.y,v.z);v.normalize();normal.setXYZ(i,v.x,v.y,v.z)}return g})}
  function leafMass(g,x,y,z,size,c,scale=[1,1,1]){return solid(g,crownGeometry(),material(c,'leaf'),x,y,z,size*scale[0],size*scale[1],size*scale[2])}
  function tree(g,x,z,height=3.1,pink=false){const t=new T.Group();t.position.set(x,-.22,z);g.add(t);const trunk=pipe(t,[[0,0,0],[.03,0,height*.44],[-.07,0,height*.72]],'#897760',.065,'wood');
    for(let i=0;i<4;i++){let a=i*2.399,dx=Math.cos(a)*height*.19,dz=Math.sin(a)*height*.16;pipe(t,[[0,0,height*.35],[dx,dz,height*.68]],'#897760',.032,'wood');leafMass(t,dx,height*(.69+hash(x,z,i)*.08),dz,height*.23,pink?['#cf98aa','#e4afbb','#dca6b7'][i%3]:['#74a58b','#659575','#91b490'][i%3],[1.08,.96,1])}
    leafMass(t,-.06,height*.83,.025,height*.25,pink?'#e6b5be':'#96bfa0',[1.12,.92,1.06]);t.userData.artHeight=height;t.userData.artSway=hash(x,z)*7;return t;
  }
  function reed(g,x,z,height=1.8){for(let i=0;i<4;i++){let dx=(i%2)*.14,dz=Math.floor(i/2)*.13;cylinder(g,x+dx,z+dz,-.21,.025,height,'#9eae79','wood');for(let j=0;j<4;j++){let y=.3+j*.35;const a=(j+i)*2.4;leafMass(g,x+dx+Math.cos(a)*.12,y,z+dz+Math.sin(a)*.12,.16,'#5b8b79',[1,.2,1.4]);}}}
  function clear(g){g.traverse(m=>{if(m.isInstancedMesh)m.dispose();if(m.userData.ownedGeometry)m.geometry.dispose();if(m.userData.ownedMaterial)m.material.dispose()});g.clear()}
  function edgesFor(cells){const edges=[];for(let key of cells){let [x,z]=key.split(',').map(Number);if(!cells.has(`${x},${z-1}`))edges.push([[x,z],[x+1,z]]);if(!cells.has(`${x+1},${z}`))edges.push([[x+1,z],[x+1,z+1]]);if(!cells.has(`${x},${z+1}`))edges.push([[x+1,z+1],[x,z+1]]);if(!cells.has(`${x-1},${z}`))edges.push([[x,z+1],[x,z]])}return edges;}
  function contours(cells){const e=edgesFor(cells),next=new Map();for(let [a,b] of e){let k=a.join(',');if(!next.has(k))next.set(k,[]);next.get(k).push(b)}const loops=[];while(next.size){const start=next.keys().next().value,first=start.split(',').map(Number),out=[first];let k=start;for(let i=0;i<=e.length;i++){const list=next.get(k);if(!list?.length)break;const p=list.pop();if(!list.length)next.delete(k);if(p.join(',')===start)break;out.push(p);k=p.join(',')}if(out.length>3)loops.push(out)}return loops;}
  function roundedShape(points,r=.24){const simple=points.filter((p,i)=>{let a=points[(i+points.length-1)%points.length],b=points[(i+1)%points.length];return (p[0]-a[0])*(b[1]-p[1])!==(p[1]-a[1])*(b[0]-p[0])});const s=new T.Shape();if(simple.length<3)return s;
    for(let i=0;i<simple.length;i++){const p=simple[i],a=simple[(i+simple.length-1)%simple.length],b=simple[(i+1)%simple.length],la=Math.hypot(a[0]-p[0],a[1]-p[1]),lb=Math.hypot(b[0]-p[0],b[1]-p[1]),rr=Math.min(r,la/3,lb/3);const pre=[p[0]+(a[0]-p[0])/la*rr,p[1]+(a[1]-p[1])/la*rr],post=[p[0]+(b[0]-p[0])/lb*rr,p[1]+(b[1]-p[1])/lb*rr];if(i===0)s.moveTo(...pre);else s.lineTo(...pre);s.quadraticCurveTo(...p,...post)}s.closePath();return s;
  }
  function terrain(cells,y,h,col,bevel){for(let loop of contours(cells)){const shape=roundedShape(loop,.38),geometry=new T.ExtrudeGeometry(shape,{depth:h,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,curveSegments:5});geometry.rotateX(Math.PI/2);const m=solid(land,geometry,material(col),0,y,0);m.userData.ownedGeometry=true;}}
  const seaUniforms={time:{value:0},sun:{value:new T.Vector3(-.4,.8,.4)},tint:{value:new T.Color('#72b9c8')},evening:{value:0}};
  const seaMaterial=new T.ShaderMaterial({uniforms:seaUniforms,vertexShader:`varying vec3 vWorld;void main(){vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}`,fragmentShader:`varying vec3 vWorld;uniform float time;uniform vec3 tint;uniform float evening;void main(){vec2 p=vWorld.xz;float a=sin(p.x*.9+p.y*.36+time*.36),b=sin(p.x*.23-p.y*.71-time*.22);float ripple=smoothstep(.965,1.,sin(p.x*3.3+p.y*1.4+sin(p.y*.32)*2.1+a*.6+time*.16))*smoothstep(.5,.95,sin(p.x*.79-p.y*.85-time*.14));vec3 c=tint*(.9+.025*a+.028*b);c=mix(c,vec3(.75,.9,.9),ripple*.07*(1.-evening*.5));float horizon=1.-exp(-length(p)*.01);c=mix(c,tint*1.07,horizon*.3);gl_FragColor=vec4(c,1.);#include <colorspace_fragment>}`.replace(';#include',';\n#include'),toneMapped:false});
  const sea=solid(scene,new T.PlaneGeometry(20000,20000),seaMaterial,0,-.72,0);sea.rotation.x=-Math.PI/2;sea.castShadow=false;sea.receiveShadow=false;
  function foam(cells){for(let loop of contours(cells)){const pts=roundedShape(loop,.5).getPoints(4),curve=new T.CatmullRomCurve3(pts.map(p=>new T.Vector3(p.x,-.705,p.y)),true);const m=solid(land,new T.TubeGeometry(curve,Math.min(600,pts.length*3),.037,4,true),new T.MeshBasicMaterial({color:'#d1e8df',transparent:true,opacity:.45}));m.userData.ownedGeometry=m.userData.ownedMaterial=true;}}
  function rects(cells){const left=new Set(cells),out=[];while(left.size){let [x,z]=left.keys().next().value.split(',').map(Number),w=1,d=1;while(w<10&&left.has(`${x+w},${z}`))w++;outer:while(d<14){for(let i=0;i<w;i++)if(!left.has(`${x+i},${z+d}`))break outer;d++;}for(let i=0;i<w;i++)for(let j=0;j<d;j++)left.delete(`${x+i},${z+j}`);out.push({x,z,w,d})}return out;}
  function joinedLobby(cells,all){for(let rect of rects(cells)){const g=new T.Group();g.position.set(rect.x,0,rect.z);buildings.add(g);g.userData.archBuilding=true;roof(g,rect.w,rect.d,2.28,'#cd8f82',Math.min(1.3,rect.w*.22));
      for(let side of ['front','back','left','right']){const facade=new T.Group();facade.userData.facadeSide=side;g.add(facade);const along=side==='left'||side==='right'?rect.d:rect.w;for(let at=0;at<along-.01;at+=2){const width=Math.min(2,along-at);if(width<.5)continue;const p=new T.Group();facade.add(p);let xx,zz,rot;
          if(side==='front'){xx=at;zz=rect.d-.08;rot=0}else if(side==='back'){xx=rect.w-at;zz=.08;rot=Math.PI}else if(side==='left'){xx=.08;zz=at;rot=-Math.PI/2}else{xx=rect.w-.08;zz=rect.d-at;rot=Math.PI/2}
          p.position.set(xx,0,zz);p.rotation.y=rot;
          const a=side==='right'?[rect.x+rect.w,rect.z+rect.d-at-1]:side==='left'?[rect.x-1,rect.z+at]:side==='front'?[rect.x+at,rect.z+rect.d]:[rect.x+at,rect.z-1];
          const covered=all.has(a.join(','));archPanel(p,width,2.28,['#e5bc96','#e9c4a7','#e4baa3'][Math.floor(at/2)%3],!covered&&Math.floor(at/2)%3!==1);
      }consolidate(facade);}
      // Hand-built dormer and a chimney break up the roof silhouette.
      if(rect.d>=5){const dorm=new T.Group();dorm.position.set(rect.w*.55,3.12,rect.d*.33);g.add(dorm);box(dorm,-.43,0,.86,.65,0,.46,'#ecd4ba','stone');archPanel(dorm,.86,.56,'#f0d7b7',false).scale.set(1,1,1);roof(dorm,.86,.75,.54,'#8fa8a0',.25);dorm.userData.dormer=true;}
      box(g,rect.w-.75,rect.d*.72,.48,.48,2.7,1.02,'#efd3b4','stone');box(g,rect.w-.85,rect.d*.72-.1,.68,.68,3.67,.1,'#4f7a77','stone');
  }}
  function update(floors){const k=[...floors].map(([p,t])=>p+':'+t).join('|');if(k===layoutKey)return;layoutKey=k;clear(land);clear(buildings);const all=new Set(floors.keys()),outer=new Set(),grass=new Set(),lobby=new Set();let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
    for(let [k,t] of floors){let [x,z]=k.split(',').map(Number);if(t==='lobby')lobby.add(k);minX=Math.min(minX,x);maxX=Math.max(maxX,x+1);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z+1);for(let dx=-3;dx<=3;dx++)for(let dz=-3;dz<=3;dz++){if(dx*dx+dz*dz<=9)outer.add(`${x+dx},${z+dz}`);if(dx*dx+dz*dz<=5)grass.add(`${x+dx},${z+dz}`)}}
    tileCount=all.size;shoreCount=outer.size;bounds={x:(minX+maxX)/2,z:(minZ+maxZ)/2,w:maxX-minX,d:maxZ-minZ};terrain(outer,-.4,.66,'#c6b090',.09);terrain(grass,-.28,.28,'#94b69a',.08);foam(outer);
    const candidates=[...grass].map(p=>p.split(',').map(Number)).filter(([x,z])=>!all.has(`${x},${z}`)&&!all.has(`${x+1},${z}`)&&!all.has(`${x-1},${z}`)&&!all.has(`${x},${z+1}`)&&!all.has(`${x},${z-1}`));
    let trees=0;for(let [x,z] of candidates){const n=hash(x,z);if(n>.91&&trees<24){tree(land,x+.5,z+.5,2.4+hash(x,z,2)*1.15,n>.978);trees++}else if(n>.58){leafMass(land,x+.5,-.1,z+.5,.4,['#94b286','#7ca387','#a5bb8a'][Math.floor(n*30)%3],[1.4,.65,1]);for(let j=0;j<3;j++)leafMass(land,x+.2+j*.22,.03,z+.3,.09,j%2?'#f3d895':'#d4a9b5',[1,.6,1])}else if(n<.12){const rock=solid(land,geo('pebble',()=>new T.IcosahedronGeometry(1,1)),material('#b1bab1','rock'),x+.5,-.23,z+.5,.2+n,.12+n,.3+n);rock.rotation.y=n*50;}}
    // A waterside stair and wooden jetty anchor the floating-world composition.
    const dock=new T.Group();dock.position.set(bounds.x-1,0,maxZ+1.4);land.add(dock);for(let j=0;j<4;j++)box(dock,.1,j*.28,1.8,.35,-.28-j*.1,.13,'#dfc59b','stone');box(dock,0,1.15,2,2.3,-.65,.13,'#c5a77e','wood');for(let j=0;j<9;j++)box(dock,.04,1.2+j*.245,1.92,.014,-.512,.006,'#a28c6b','wood',.002);for(let x of [.13,1.87])for(let z of [1.27,3.28])cylinder(dock,x,z,-1.02,.055,.75,'#8b8069','wood');
    joinedLobby(lobby,all);if(!renderer.babylonAuthoring)consolidate(land);renderer.shadowMap.needsUpdate=true;
  }
  function dress(g,a){if(a.cat==='rooms'){
      const shell=new T.Group();g.add(shell);shell.userData.archBuilding=true;const w=a.w,d=a.d,roofColor=a.id==='sauna'?'#76978d':a.id==='quiet'?'#789b9a':a.id==='changing'?'#cb9483':'#c89183';
      if(a.id==='steam')bathhouseDome(shell,w,d);else roof(shell,w,d,2.12,roofColor,.55+w*.06);const front=new T.Group();front.position.z=d-.06;shell.add(front);archPanel(front,w,2.1,a.id==='sauna'?'#d7ad86':'#e6c8b1',false);front.userData.facadeSide='front';
      for(let x of [.06,w-.16])box(shell,x,.04,.1,d-.09,1.68,.44,a.id==='quiet'?'#99b9ab':'#d9bca5','stone');
      box(shell,.03,.01,w-.06,.15,1.68,.44,'#dfc7ad','stone');
    }else if(a.id==='bath'||a.id==='stonebath'){
      const g2=new T.Group();g.add(g2);g2.userData.archBuilding=true;roof(g2,a.w,a.d,1.96,a.id==='bath'?'#83a8a6':'#c89684',.63);for(let x of [.03,a.w-.14])for(let z of [.04,a.d-.14])box(g2,x,z,.11,.11,.04,1.94,'#bcaa8b','wood');const p=new T.Group();g2.add(p);archPanel(p,a.w,1.95,'#e2c1ae',false);p.rotation.y=Math.PI;p.position.set(a.w,0,.11);p.userData.facadeSide='back';
    }else if(a.id==='onsen'){
      // A timber pavilion: designed trusses and climbing greenery, rather than an isolated bucket.
      const p=new T.Group();g.add(p);p.userData.archBuilding=true;for(let x of [.04,a.w-.13])for(let z of [.04,a.d-.13])box(p,x,z,.095,.095,.03,1.99,'#bba482','wood');for(let z of [.1,a.d-.1])box(p,.04,z,a.w-.08,.1,1.94,.11,'#c8b28f','wood');for(let i=0;i<7;i++){const slat=box(p,.05,.1+i*(a.d-.2)/6,a.w-.1,.075,2.04,.055,'#dcc399','wood');slat.userData.pergola=true;}for(let j=0;j<5;j++)leafMass(p,.08,1.99,.3+j*.48,.22,'#74997f',[1,.35,1.4]);
    }else if(a.id==='plant'){
      const crown=new T.Group();g.add(crown);for(let i=0;i<5;i++){let ang=i*2.4;leafMass(crown,.5+Math.cos(ang)*.19,1.56+(i%3)*.16,.5+Math.sin(ang)*.19,.28,['#769c79','#8eb293','#a1bd94'][i%3],[1,.86,1]);}
    }
    return g;
  }
  function visibleBuilding(g,angle,mode){const local=angle-g.rotation.y;
    const show=(o,v)=>{if(o.visible!==v){o.visible=v;renderer.shadowMap.needsUpdate=true;}};
    g.traverse(o=>{if(o.userData.roofSide){show(o,mode==='full'||(mode==='cutaway'&&o.userData.roofSide*Math.sin(local)<0))}if(o.userData.roofRidge)show(o,mode!=='none');if(o.userData.gableEnd)show(o,mode==='full'||(mode==='cutaway'&&o.userData.gableEnd*Math.cos(local)<0));if(o.userData.dormer)show(o,mode==='full');
      if(o.userData.facadeSide){const side=o.userData.facadeSide,front=side==='front'?Math.cos(local)>.12:side==='back'?Math.cos(local)<-.12:side==='left'?Math.sin(local)<-.12:Math.sin(local)>.12;const s=mode==='full'||!front?1:.25;if(o.scale.y!==s){o.scale.y=s;renderer.shadowMap.needsUpdate=true;}}
      if(o.userData.pergola)show(o,mode==='full');
    });
  }
  function animate(angle,models,t,openForBuilding){time=t;seaUniforms.time.value=t;const mode=openForBuilding?'none':roofMode;for(let g of buildings.children)visibleBuilding(g,angle,mode);for(let g of models){g.traverse(p=>{if(p.userData.archBuilding)visibleBuilding(p,angle-g.rotation.y,mode)})}land.traverse(g=>{if(g.userData.artSway!==undefined)g.rotation.z=Math.sin(t*.6+g.userData.artSway)*.007});}
  function setTheme(t){seaUniforms.tint.value.set(t==='evening'?'#4c7795':t==='golden'?'#7cbbc0':'#7bbdc9');seaUniforms.evening.value=t==='evening'?1:0;}
  return {update,dress,animate,setTheme,setRoofMode:v=>roofMode=v,get roofMode(){return roofMode},get bounds(){return bounds},get root(){return world},get sea(){return sea},stats:()=>({buildings:buildings.children.length,terrainMeshes:land.children.length,tiles:tileCount,shoreTiles:shoreCount,bounds:{...bounds},roofMode})};
}};
})();
