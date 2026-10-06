"""Bake detailed botanical glTF models once; the browser loads the resulting meshes."""
import bpy, math, random
from mathutils import Vector
from pathlib import Path
ROOT=Path('/workspace/spa/assets');ROOT.mkdir(exist_ok=True)
random.seed(481)
def material(name,color,roughness=.7):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Roughness'].default_value=roughness;return m
def mesh(name,vertices,faces,mat):
 data=bpy.data.meshes.new(name);data.from_pydata(vertices,[],faces);data.update();o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.data.materials.append(mat)
 for p in data.polygons:p.use_smooth=True
 return o
def lathe(name,profile,mat):
 vs=[];faces=[];segments=64
 for r,z in profile:
  for j in range(segments):a=j*2*math.pi/segments;vs.append((r*math.cos(a),r*math.sin(a),z))
 for i in range(len(profile)-1):
  for j in range(segments):a=i*segments+j;b=i*segments+(j+1)%segments;faces.append((a,b,b+segments,a+segments))
 return mesh(name,vs,faces,mat)
def stem(points,radius,mat):
 curve=bpy.data.curves.new('Curved stem','CURVE');curve.dimensions='3D';curve.bevel_depth=radius;curve.bevel_resolution=2;spline=curve.splines.new('POLY');spline.points.add(len(points)-1)
 for p,co in zip(spline.points,points):p.co=(*co,1)
 obj=bpy.data.objects.new('Stem',curve);bpy.context.collection.objects.link(obj);obj.data.materials.append(mat);return obj
def leaf(origin,direction,length,width,mat,curve=.04):
 axis=Vector(direction).normalized();side=axis.cross(Vector((0,0,1)))
 if side.length<.01:side=Vector((1,0,0))
 side.normalize();vs=[];faces=[];start=Vector(origin)
 for j in range(9):
  t=j/8;mid=start+axis*(length*t)+Vector((0,0,math.sin(t*math.pi)*curve));w=math.sin(t*math.pi)**.8*width
  for k in [-1,0,1]:vs.append(tuple(mid+side*w*k+Vector((0,0,-abs(k)*w*.17))))
 for j in range(8):
  for k in range(2):a=j*3+k;faces.append((a,a+1,a+4,a+3))
 return mesh('Tapered curved leaf',vs,faces,mat)
def setup():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 clay=material('Glazed warm ceramic',(.43,.30,.20),.28);soil=material('Potting soil',(.055,.044,.026),1);bark=material('Olive bark',(.19,.15,.09),.85)
 lathe('Hand-thrown ceramic pot',[(0,.02),(.2,.02),(.23,.08),(.30,.37),(.31,.41),(.29,.435),(.265,.41),(.25,.365),(.19,.08),(0,.08)],clay)
 lathe('Soil',[(0,.37),(.26,.37)],soil)
 return bark,[material('Silvery olive '+str(i),col,.73) for i,col in enumerate([(.16,.24,.12),(.26,.33,.18),(.38,.43,.25),(.22,.32,.17)])]
def export(name):
 bpy.ops.object.select_all(action='SELECT');bpy.context.view_layer.objects.active=next(iter(bpy.context.scene.objects))
 # Convert stems and join by material to keep draw calls small.
 bpy.ops.object.convert(target='MESH');groups={}
 for o in list(bpy.context.scene.objects):
  if o.type=='MESH':groups.setdefault(o.active_material.name,[]).append(o)
 for objects in groups.values():
  bpy.ops.object.select_all(action='DESELECT')
  for o in objects:o.select_set(True)
  bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
 bpy.ops.export_scene.gltf(filepath=str(ROOT/name),export_format='GLB',export_yup=True,export_apply=True,export_materials='EXPORT')
bark,greens=setup();stem([(0,0,.4),(.025,0,.85),(-.02,.015,1.45),(.04,0,1.92)],.028,bark)
for branch in range(18):
 angle=branch*2.399;z=.8+(branch%6)*.16;r=.29+(branch%3)*.10;start=Vector((0,0,z));tip=Vector((math.cos(angle)*r,math.sin(angle)*r,z+.21));stem([start,start.lerp(tip,.48)+Vector((0,0,.08)),tip],.008,bark)
 for j in range(12):
  t=.16+j*.064;origin=start.lerp(tip,t);side=j%2*2-1;direction=(math.cos(angle+side*.85),math.sin(angle+side*.85),.18+random.random()*.18);leaf(origin,direction,.13+random.random()*.04,.025,greens[(j+branch)%4],.022)
for i in range(28):
 a=i*2.399;z=1.48+(i%5)*.09;leaf((.03,0,z),(math.cos(a),math.sin(a),.22),.17,.028,greens[i%4],.022)
export('olive-tree.glb')
bark,greens=setup();stem([(0,0,.39),(.03,0,.85),(-.02,0,1.35)],.032,bark)
for i in range(10):
 a=i*2.399;reach=.54+random.random()*.18;points=[]
 for j in range(16):
  t=j/15;points.append(Vector((math.cos(a)*reach*t,math.sin(a)*reach*t,1.30+math.sin(t*math.pi*.8)*.33-t*.23)))
 stem(points,.006,bark)
 for j in range(1,15):
  t=j/15;origin=points[j];length=.15+math.sin(t*math.pi)*.17
  for side in [-1,1]:leaf(origin,(math.cos(a+side*1.04),math.sin(a+side*1.04),-.12),length,.025,greens[(i+j)%4],.016)
export('indoor-palm.glb')
