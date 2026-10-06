/* A small local image pipeline: depth-based contact shading, clean color, and restrained glow. */
(() => {
'use strict';const T=window.THREE;if(!T)return;
window.StillwaterPostprocessing={create(renderer){
  let lastScene={},mode='balanced',size=new T.Vector2(),supported=(renderer.capabilities.isWebGL2||renderer.extensions.has('WEBGL_depth_texture'))&&renderer.extensions.has(renderer.capabilities.isWebGL2?'EXT_color_buffer_float':'EXT_color_buffer_half_float');
  if(!supported)return {render:(s,c)=>renderer.render(s,c),setQuality:()=>{},stats:()=>({depthShading:false})};
  const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,minFilter:T.LinearFilter,magFilter:T.LinearFilter,depthBuffer:true});
  target.depthTexture=new T.DepthTexture(1,1,T.UnsignedIntType);
  target.samples=renderer.capabilities.isWebGL2?2:0;
  const uniforms={image:{value:target.texture},depthImage:{value:target.depthTexture},inverseProjection:{value:new T.Matrix4()},resolution:{value:new T.Vector2()},radiusPixels:{value:20},worldRadius:{value:.85},strength:{value:1.55},exposure:{value:1.0},glow:{value:0}};
  const material=new T.ShaderMaterial({uniforms,toneMapped:false,depthTest:false,depthWrite:false,vertexShader:`varying vec2 uvScreen;void main(){uvScreen=uv;gl_Position=vec4(position.xy,0.,1.);}`,fragmentShader:`
  varying vec2 uvScreen;uniform sampler2D image;uniform sampler2D depthImage;uniform mat4 inverseProjection;uniform vec2 resolution;uniform float radiusPixels;uniform float worldRadius;uniform float strength;uniform float exposure;uniform float glow;
  vec3 positionAt(vec2 uv){float z=texture2D(depthImage,uv).r;vec4 p=inverseProjection*vec4(uv*2.-1.,z*2.-1.,1.);return p.xyz/p.w;}
  vec3 film(vec3 c){c*=exposure;return clamp((c*(2.51*c+.03))/(c*(2.43*c+.59)+.14),0.,1.);}
  void main(){
    vec2 uv=uvScreen;vec3 p=positionAt(uv),normal=normalize(cross(dFdx(p),dFdy(p)));if(normal.z<0.)normal=-normal;
    float ao=0.;
    for(int i=0;i<12;i++){float f=float(i);float a=f*2.399963;vec2 offset=vec2(cos(a),sin(a))*radiusPixels*(.22+.065*f)/resolution;vec3 delta=positionAt(uv+offset)-p;float dist=length(delta);float facing=max(0.,dot(normal,delta)/max(dist,.001)-.11);ao+=facing*(1.-smoothstep(.06,worldRadius,dist));}
    ao=clamp(ao/12.*strength*2.8,0.,.62);
    vec3 c=texture2D(image,uv).rgb;
    // Preserve material color in the shade instead of turning recesses black.
    c*=mix(vec3(1.),vec3(.49,.58,.67),ao);
    vec3 bloom=vec3(0.);
    for(int i=0;i<6;i++){float a=float(i)*1.0472;vec3 b=texture2D(image,uv+vec2(cos(a),sin(a))*4./resolution).rgb;bloom+=max(b-vec3(1.1),vec3(0.));}
    c+=bloom*glow*.08;
    c=film(c);float lum=dot(c,vec3(.2126,.7152,.0722));c=mix(vec3(lum),c,1.075);
    float vignette=dot(uv-.5,uv-.5);c*=1.-vignette*.08;
    gl_FragColor=vec4(c,1.);
    #include <colorspace_fragment>
  }`});
  material.extensions.derivatives=true;
  const screen=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,0,1);screen.add(new T.Mesh(new T.PlaneGeometry(2,2),material));
  const render=(scene,view,zoom=43,theme='morning')=>{
    if(mode==='simple'){renderer.setRenderTarget(null);renderer.render(scene,view);lastScene={...renderer.info.render};return;}
    const wanted=renderer.getDrawingBufferSize(new T.Vector2());if(size.x!==wanted.x||size.y!==wanted.y){size.copy(wanted);target.setSize(size.x,size.y);uniforms.resolution.value.copy(size)}
    uniforms.inverseProjection.value.copy(view.projectionMatrixInverse);uniforms.radiusPixels.value=Math.min(48,Math.max(8,zoom*renderer.getPixelRatio()*.56));uniforms.strength.value=mode==='lush'?1.7:1.45;uniforms.exposure.value=renderer.toneMappingExposure;uniforms.glow.value=theme==='evening'?1:0;
    renderer.setRenderTarget(target);renderer.render(scene,view);lastScene={...renderer.info.render};renderer.setRenderTarget(null);renderer.render(screen,camera);
  };
  return {render,setQuality:v=>{mode=v;const samples=renderer.capabilities.isWebGL2?(v==='lush'?4:2):0;if(samples!==target.samples){target.dispose();target.samples=samples}},stats:()=>({depthShading:mode!=='simple',antialiasSamples:target.samples,width:size.x,height:size.y,scene:lastScene}),dispose:()=>{target.dispose();material.dispose()}};
}};
})();
