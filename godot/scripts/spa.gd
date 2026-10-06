extends Node3D
## Godot owns the world, imported assets, animation, camera, placement and simulation.
## The browser shell is a lightweight, accessible editor interface.

const TILE := 1.8
const SAVE_PATH := "user://stillwater-godot-v2.json"
const NEIGHBORS := [Vector2i(1,0),Vector2i(-1,0),Vector2i(0,1),Vector2i(0,-1)]
var catalog: Array = []
var definitions: Dictionary = {}
var floors: Dictionary = {}
var objects: Array = []
var guests: Array = []
var templates: Dictionary = {}
var occupancy: Dictionary = {}
var floor_root := Node3D.new()
var object_root := Node3D.new()
var landscape := Node3D.new()
var walls_root := Node3D.new()
var lobby_roofs := Node3D.new()
var guest_root := Node3D.new()
var camera := Camera3D.new()
var sun := DirectionalLight3D.new()
var environment := WorldEnvironment.new()
var ghost := Node3D.new()
var island: Node3D
var water_material: ShaderMaterial
var contact_material: StandardMaterial3D
var hover_tile := Vector2i.ZERO
var hover_valid := false
var ghost_type := ""
var tool := "explore"
var chosen := "onsen"
var floor_style := "stone"
var build_rotation := 0
var selected := -1
var next_id := 1
var money := 12000.0
var earned := 0.0
var visits := 0
var happiness := 72.0
var free_build := true
var paused := false
var roofs := false
var lighting := "morning"
var detail := "balanced"
var target := Vector3.ZERO
var azimuth := 0.73
var elevation := 0.8
var zoom := 34.0
var dragging := false
var drag_button := 0
var drag_origin := Vector2.ZERO
var drag_length := 0.0
var touches: Dictionary = {}
var touch_distance := 0.0
var spawn_clock := 0.0
var state_clock := 0.0
var save_clock := 0.0
var time := 0.0
var gallery_root := Node3D.new()
var gallery_active := false
var revision := 0
var last_message := "Welcome. Start with a warm bath, or explore the example retreat."
var undo_stack: Array = []
var js_available := false
var rng := RandomNumberGenerator.new()

func _ready() -> void:
	Engine.max_fps=45
	rng.randomize()
	catalog = JSON.parse_string(FileAccess.get_file_as_string("res://assets/catalog.json"))
	for a in catalog: definitions[a.id] = a
	for root in [floor_root,object_root,landscape,walls_root,lobby_roofs,guest_root,ghost,gallery_root]: add_child(root)
	_setup_world()
	get_viewport().size_changed.connect(_update_camera)
	js_available = OS.has_feature("web")
	if js_available: JavaScriptBridge.eval("window.spaCommands=window.spaCommands||[];window.spaReady=true",true)
	_reset(false)
	var saved=null
	if js_available:
		var stored=JavaScriptBridge.eval("(()=>{try{return localStorage.getItem('stillwater-godot-save-v2')}catch(e){return null}})()",true)
		if stored is String:saved=JSON.parse_string(stored)
	if not _valid_save(saved) and FileAccess.file_exists(SAVE_PATH):saved=JSON.parse_string(FileAccess.get_file_as_string(SAVE_PATH))
	if _valid_save(saved):_load_save(saved)
	_rebuild()
	_update_camera()
	_send_state()
	print("STILLWATER_READY: Godot scene, %d imported asset templates, %d catalog items" % [templates.size(),catalog.size()])

func _setup_world() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("b9c9bd")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("e9e4d7")
	env.ambient_light_energy = 0.22
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.tonemap_exposure = 1.0
	environment.environment = env
	add_child(environment)
	sun.rotation_degrees = Vector3(-48,-38,0)
	sun.light_color = Color("fff0d5")
	sun.light_energy = 0.34
	sun.shadow_enabled = true
	sun.shadow_bias = 0.16
	sun.shadow_normal_bias = 1.4
	sun.directional_shadow_mode=DirectionalLight3D.SHADOW_ORTHOGONAL
	sun.directional_shadow_max_distance = 110.0
	add_child(sun)
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.near = 0.02
	camera.far = 1500
	add_child(camera)
	camera.make_current()
	var shader := Shader.new()
	shader.code = """
shader_type spatial;
render_mode specular_schlick_ggx;
uniform vec3 water_color : source_color = vec3(0.40,0.66,0.61);
void vertex(){VERTEX.y += sin(VERTEX.x*2.0+TIME*0.7)*sin(VERTEX.z*1.7+TIME*0.6)*0.006;}
void fragment(){
 vec2 p=UV*18.0;
 float ripple=sin(p.x+TIME*.45)*sin(p.y+TIME*.31);
 float caustic=smoothstep(.86,.99,sin(p.x*1.6+p.y*.7+TIME*.4)*sin(p.y*1.4-p.x*.3+TIME*.3));
 ALBEDO=water_color+vec3(ripple*.025+caustic*.07);
 ROUGHNESS=.27; METALLIC=.12; SPECULAR=.5;
}
"""
	water_material = ShaderMaterial.new()
	water_material.shader = shader
	contact_material = StandardMaterial3D.new()
	contact_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	contact_material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	contact_material.albedo_color = Color(0.27,0.30,0.23,0.17)
	contact_material.no_depth_test = false
	var image := Image.create(64,64,false,Image.FORMAT_RGBA8)
	for y in range(64):
		for x in range(64):
			var radius := Vector2((x-31.5)/31.5,(y-31.5)/31.5).length()
			image.set_pixel(x,y,Color(1,1,1,pow(maxf(0.0,1-radius),2)))
	contact_material.albedo_texture = ImageTexture.create_from_image(image)
	island = _model("res://assets/spa/island.glb")
	landscape.add_child(island)
	# Authored scenery from the same KayKit family, distributed around the build area.
	for i in range(25):
		var angle := i*TAU/25
		var pos := Vector3(cos(angle)*(16.5+rng.randf()*2.2),-.2,sin(angle)*(13.5+rng.randf()*2))
		var tree = _model(_asset_path("nature","tree_single_A" if i%3 else "trees_B_small"))
		if tree:
			tree.scale = Vector3.ONE*(3.8+rng.randf()*1.4)
			tree.position = pos
			tree.rotation.y = rng.randf()*TAU
			_tint_meshes(tree,Color("88a788") if i%3 else Color("70957c"),false)
			landscape.add_child(tree)
	for i in range(22):
		var bush = _model(_asset_path("city","bush"))
		bush.scale = Vector3.ONE*(1.5+rng.randf())
		var angle := i*TAU/22+.12
		bush.position = Vector3(cos(angle)*15,-.19,sin(angle)*12.7)
		_tint_meshes(bush,Color("8da68a"),false)
		landscape.add_child(bush)

func _asset_path(pack: String, name: String) -> String:
	if pack == "nature": return "res://assets/kaykit/nature/gltf/decoration/nature/"+name+".gltf"
	return "res://assets/kaykit/"+pack+"/gltf/"+name+".gltf"

func _model(path: String) -> Node3D:
	if not templates.has(path):
		var resource = load(path)
		if resource == null:
			push_error("Missing model: "+path)
			return Node3D.new()
		templates[path] = resource
	var node: Node3D = templates[path].instantiate()
	_polish(node)
	return node

func _polish(node: Node) -> void:
	if node is MeshInstance3D:
		if str(node.name).begins_with("Water"):
			node.material_override = water_material
			node.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		else:
			for i in range(node.mesh.get_surface_count()):
				var mat = node.mesh.surface_get_material(i)
				if mat is StandardMaterial3D:
					# Shared imported material resources are polished once, preserving their authored atlas.
					mat.roughness = .92
					mat.metallic_specular = .18
	for child in node.get_children(): _polish(child)

func _clear(node: Node) -> void:
	for c in node.get_children():
		node.remove_child(c)
		c.queue_free()

func _reset(example: bool) -> void:
	floors.clear(); objects.clear(); _clear_guests()
	next_id=1;money=12000;earned=0;visits=0;happiness=72;selected=-1;free_build=true
	var xmax := 8 if example else 5
	var zmax := 6 if example else 3
	for x in range(-7,xmax+1):
		for z in range(-5,zmax+1): floors[Vector2i(x,z)] = "wood" if x < -1 else "stone"
	_add_object("cashier",Vector2i(-6,-4),0)
	_add_object("sofa",Vector2i(-6,0),0)
	_add_object("armchair",Vector2i(-3,0),0)
	_add_object("teatable",Vector2i(-6,2),0)
	_add_object("plant",Vector2i(-7,-5),0)
	_add_object("palm",Vector2i(-2,-5),0)
	_add_object("lantern",Vector2i(-7,0),0)
	_add_object("bookshelf",Vector2i(-5,-5),0)
	_add_object("flowers",Vector2i(-2,3),0)
	if example:
		for placement in [["onsen",0,-4,0],["pool",3,0,0],["plunge",0,1,0],["steam",5,-4,0],["sauna",5,4,2],["bath",-1,4,1],["changing",-6,4,0],["shower",3,-4,0],["toilet",-2,-4,0],["cafe",-6,-2,0],["lounger",3,4,0],["lounger",4,4,0],["planter",0,-5,0],["fountain",0,-1,0],["plant",8,-5,0],["palm",8,3,0],["armchair",-3,2,0]]:
			var p:=Vector2i(placement[1],placement[2])
			# Preset goes through the same collision checks as interactive building.
			if _can_place(placement[0],p,placement[3]): _add_object(placement[0],p,placement[3])
	azimuth=.73;elevation=.8;zoom=40 if example else 34;target=Vector3(0,0,0)
	tool="explore";spawn_clock=3
	last_message="Your retreat is ready. Every furnishing is editable." if example else "Your lobby is ready. Add your first bath to welcome guests."

func _dimensions(a: Dictionary, rot: int) -> Vector2i:
	return Vector2i(int(a.d),int(a.w)) if rot%2 else Vector2i(int(a.w),int(a.d))

func _occupied_cells(o: Dictionary) -> Array:
	var cells: Array=[]
	var dims:=_dimensions(definitions[o.type],o.rot)
	for x in range(dims.x):
		for z in range(dims.y): cells.append(Vector2i(o.x+x,o.z+z))
	return cells

func _update_occupancy() -> void:
	occupancy.clear()
	for o in objects:
		if o.type=="rug": continue
		for p in _occupied_cells(o): occupancy[p]=o.id

func _can_place(type: String, cell: Vector2i, rot: int) -> bool:
	if not definitions.has(type): return false
	_update_occupancy()
	var dims:=_dimensions(definitions[type],rot)
	for x in range(dims.x):
		for z in range(dims.y):
			var p:=cell+Vector2i(x,z)
			if not floors.has(p) or occupancy.has(p): return false
	return true

func _add_object(type: String, p: Vector2i, rot: int) -> void:
	objects.append({"id":next_id,"type":type,"x":p.x,"z":p.y,"rot":rot,"clean":100.0,"uses":0})
	next_id+=1
	_update_occupancy()

func _build_facility(o: Dictionary) -> Node3D:
	var a: Dictionary=definitions[o.type]
	var node:=Node3D.new()
	var dims:=_dimensions(a,o.rot)
	node.position=Vector3((o.x+dims.x*.5)*TILE,0,(o.z+dims.y*.5)*TILE)
	node.rotation.y=o.rot*PI*.5
	if a.model != "": node.add_child(_model("res://assets/spa/"+a.model+".glb"))
	if a.imported.size()>0:
		var imported:=_model(_asset_path(a.imported[0],a.imported[1]))
		imported.scale=Vector3.ONE*float(a.imported[2])
		node.add_child(imported)
		if o.type in ["sofa","armchair"]:_tint_meshes(imported,Color("ced0b7"),false)
		if o.type in ["tree","pine"]:_tint_meshes(imported,Color("85a184"),false)
	if o.type=="quiet":
		for x in [-2.0,0.0,2.0]:
			var bed:=_model("res://assets/spa/lounger.glb");bed.position=Vector3(x,0,.35);node.add_child(bed)
	if o.type in ["cafe","bar"]:
		var second:=_model(_asset_path("restaurant","kitchencounter_straight_A"))
		second.position=Vector3(1.6,0,0);second.scale=Vector3.ONE*.85;node.add_child(second)
		var shelf:=_model(_asset_path("furniture","shelf_B_small_decorated"))
		shelf.position=Vector3(-1.6,0,.45);shelf.scale=Vector3.ONE*.8;node.add_child(shelf)
		for i in range(4):
			var jar:=_model(_asset_path("restaurant","jar_B_large" if i%2 else "jar_D_medium"))
			jar.position=Vector3(-.45+i*.55,1.3,.15);jar.scale=Vector3.ONE*.45;node.add_child(jar)
		var menu:=_model(_asset_path("restaurant","menu"));menu.position=Vector3(1.85,1.3,.2);menu.scale=Vector3.ONE*.4;node.add_child(menu)
	if o.type=="pinksofa":
		_tint_meshes(node,Color("c39685"),false)
	if o.type=="bamboo":
		for x in [-1.1,0.0,1.1]:
			var tree:=_model("res://assets/spa/potted_tree.glb");tree.position=Vector3(x,.36,0);tree.scale=Vector3(.65,1.0,.65);node.add_child(tree)
	if o.type=="rocks":
		for i in range(4):
			var rock:=_model("res://assets/spa/rock.glb");rock.position=Vector3(-1.7+i,.04,sin(i*2.0)*.6);rock.scale=Vector3.ONE*(.6+i*.12);node.add_child(rock)
	if o.type=="lantern":
		var light:=OmniLight3D.new();light.light_color=Color("ffe1aa");light.light_energy=.16;light.omni_range=3.5;light.position=Vector3(0,1.5,0);node.add_child(light)
	_add_contact(node,Vector2(float(a.w)*TILE*.85,float(a.d)*TILE*.85))
	if o.has("id"):
		var body:=StaticBody3D.new()
		body.set_meta("facility",o.id)
		var collision:=CollisionShape3D.new()
		var shape:=BoxShape3D.new()
		var height:float=2.4 if a.cat=="rooms" else (1.35 if a.cat=="garden" else 1.1)
		shape.size=Vector3(float(a.w)*TILE*.90,height,float(a.d)*TILE*.86)
		collision.shape=shape;collision.position.y=height*.5
		body.add_child(collision);node.add_child(body)
	_update_roof_nodes(node)
	if o.type in ["onsen","steam","sauna"]: _add_steam(node,a)
	return node

func _add_contact(node: Node3D, size: Vector2) -> void:
	var mesh:=MeshInstance3D.new()
	var plane:=PlaneMesh.new();plane.size=size
	mesh.mesh=plane;mesh.material_override=contact_material;mesh.position.y=.012
	mesh.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	node.add_child(mesh)

func _tint_meshes(node: Node, color: Color, outfit: bool) -> void:
	if node is MeshInstance3D and (not outfit or ("Head" not in str(node.name))):
		var material:=StandardMaterial3D.new()
		material.albedo_color=color;material.roughness=.92;material.metallic_specular=.1
		node.material_override=material
	for c in node.get_children(): _tint_meshes(c,color,outfit)

func _add_steam(node: Node3D, a: Dictionary) -> void:
	# CPU particles are supported by the browser's Compatibility renderer.
	var particles:=CPUParticles3D.new()
	particles.name="Steam"
	particles.amount=12;particles.lifetime=3.8;particles.preprocess=2
	particles.emission_shape=CPUParticles3D.EMISSION_SHAPE_BOX
	particles.emission_box_extents=Vector3(a.w*.22,.01,a.d*.22)
	particles.position.y=1.05
	particles.direction=Vector3.UP;particles.spread=12
	particles.gravity=Vector3(0,.02,0)
	particles.initial_velocity_min=.16;particles.initial_velocity_max=.26
	particles.scale_amount_min=.25;particles.scale_amount_max=.65
	var curve:=Curve.new();curve.add_point(Vector2(0,.25));curve.add_point(Vector2(.4,.8));curve.add_point(Vector2(1,1))
	particles.scale_amount_curve=curve
	var colors:=Gradient.new();colors.set_color(0,Color(1,1,.95,0));colors.set_color(1,Color(1,1,.95,0));colors.add_point(.3,Color(1,1,.95,.1))
	particles.color_ramp=colors
	var quad:=SphereMesh.new();quad.radius=.5;quad.height=1;quad.radial_segments=8;quad.rings=4
	var mat:=StandardMaterial3D.new();mat.transparency=BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.shading_mode=BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.vertex_color_use_as_albedo=true
	quad.material=mat;particles.mesh=quad
	particles.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	node.add_child(particles)

func _update_roof_nodes(node: Node) -> void:
	if str(node.name).begins_with("Roof"): node.visible=roofs and tool=="explore"
	for c in node.get_children(): _update_roof_nodes(c)

func _rebuild() -> void:
	_clear(floor_root);_clear(object_root);_clear(walls_root);_clear(lobby_roofs);_clear(ghost);ghost_type=""
	_update_occupancy()
	# Native hardware instancing draws each floor material in a single call.
	for style in ["stone","wood","garden"]:
		var cells:Array=[]
		for p in floors:
			if floors[p]==style:cells.append(p)
		if cells.is_empty():continue
		var sample:=_model("res://assets/spa/floor_"+style+".glb")
		var parts:Array=[]
		_collect_meshes(sample,Transform3D.IDENTITY,parts)
		for part in parts:
			var instances:=MultiMesh.new()
			instances.transform_format=MultiMesh.TRANSFORM_3D
			instances.mesh=part.mesh
			instances.instance_count=cells.size()
			for i in range(cells.size()):
				var p:Vector2i=cells[i]
				instances.set_instance_transform(i,Transform3D(Basis.IDENTITY,Vector3((p.x+.5)*TILE,0,(p.y+.5)*TILE))*part.transform)
			var batch:=MultiMeshInstance3D.new();batch.multimesh=instances;floor_root.add_child(batch)
		sample.free()
	for o in objects: object_root.add_child(_build_facility(o))
	for p in floors:
		if floors[p]!="wood": continue
		for direction in NEIGHBORS:
			var q:Vector2i=p+direction
			if floors.get(q)=="wood": continue
			var far_side:bool=direction.y<0 or direction.x<0
			var kind:="wall" if far_side else "low_wall"
			if floors.has(q):kind="arch" if p.y%3==0 and direction.x>0 else "low_wall"
			# The lobby keeps an open front entrance.
			if direction.y>0 and p.x in [-6,-5,-4]: continue
			var wall:=_model("res://assets/spa/"+kind+".glb")
			wall.position=Vector3((p.x+.5+direction.x*.5)*TILE,0,(p.y+.5+direction.y*.5)*TILE)
			wall.rotation.y=PI*.5 if direction.x else 0.0
			walls_root.add_child(wall)
	var wood:Array=[]
	for p in floors:
		if floors[p]=="wood":wood.append(p)
	if not wood.is_empty():
		var minx:int=wood[0].x;var minz:int=wood[0].y;var maxx:=minx;var maxz:=minz
		for p in wood:minx=mini(minx,p.x);minz=mini(minz,p.y);maxx=maxi(maxx,p.x);maxz=maxi(maxz,p.y)
		for x in range(minx,maxx+1,3):
			for z in range(minz,maxz+1,3):
				var complete:=true
				for xx in range(x,x+3):
					for zz in range(z,z+3):
						if floors.get(Vector2i(xx,zz))!="wood":complete=false
				if not complete:continue
				var pavilion:=_model("res://assets/spa/pavilion.glb")
				for child in pavilion.get_children():
					if child is Node3D and not str(child.name).begins_with("Roof"):child.visible=false
				pavilion.position=Vector3((x+1.5)*TILE,0,(z+1.5)*TILE)
				lobby_roofs.add_child(pavilion);_update_roof_nodes(pavilion)
	_resize_island()
	_update_camera()
	_send_state()

func _collect_meshes(node: Node3D, parent: Transform3D, parts: Array) -> void:
	var transform:Transform3D=parent*node.transform
	if node is MeshInstance3D:parts.append({"mesh":node.mesh,"transform":transform})
	for child in node.get_children():
		if child is Node3D:_collect_meshes(child,transform,parts)

func _resize_island() -> void:
	var minx:=-7;var maxx:=5;var minz:=-5;var maxz:=3
	for p in floors:
		minx=mini(minx,p.x);maxx=maxi(maxx,p.x);minz=mini(minz,p.y);maxz=maxi(maxz,p.y)
	island.scale=Vector3(maxf(1,(maxx-minx+10)*TILE/46.0),1,maxf(1,(maxz-minz+10)*TILE/39.0))
	island.position=Vector3((minx+maxx+1)*TILE*.5,0,(minz+maxz+1)*TILE*.5)
	# Keep existing scenic assets away from newly painted floors.
	for child in landscape.get_children():
		if child==island:continue
		child.visible=not floors.has(Vector2i(floori(child.position.x/TILE),floori(child.position.z/TILE)))

func _update_camera() -> void:
	var radius:=maxf(zoom*1.8,25)
	camera.position=target+Vector3(sin(azimuth)*cos(elevation),sin(elevation),cos(azimuth)*cos(elevation))*radius
	camera.look_at(target)
	var size:Vector2=get_viewport().get_visible_rect().size
	camera.size=zoom*maxf(1.0,size.y/maxf(size.x*1.5,1))

func _ground_at(screen: Vector2) -> Variant:
	var origin:=camera.project_ray_origin(screen)
	var direction:=camera.project_ray_normal(screen)
	return Plane(Vector3.UP,0).intersects_ray(origin,direction)

func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		if event.button_index in [MOUSE_BUTTON_WHEEL_UP,MOUSE_BUTTON_WHEEL_DOWN] and event.pressed:
			zoom=clampf(zoom*(.9 if event.button_index==MOUSE_BUTTON_WHEEL_UP else 1.11),.7,450)
			_update_camera()
		elif event.button_index in [MOUSE_BUTTON_LEFT,MOUSE_BUTTON_RIGHT,MOUSE_BUTTON_MIDDLE]:
			if event.pressed:
				dragging=true;drag_button=event.button_index;drag_origin=event.position;drag_length=0
			else:
				if dragging and drag_length<7 and drag_button==MOUSE_BUTTON_LEFT: _click(event.position)
				dragging=false
	if event is InputEventMouseMotion:
		var hit=_ground_at(event.position)
		if hit!=null:
			hover_tile=Vector2i(floori(hit.x/TILE),floori(hit.z/TILE));_update_ghost()
		if dragging:
			drag_length+=event.relative.length()
			if drag_button!=MOUSE_BUTTON_LEFT or Input.is_key_pressed(KEY_SHIFT):
				var right:=camera.global_basis.x
				var forward:=Vector3(camera.global_basis.z.x,0,camera.global_basis.z.z).normalized()
				target-=right*event.relative.x*zoom/1000
				target-=forward*event.relative.y*zoom/1000
			elif tool=="floor" and drag_length>7:
				_paint_floor(hover_tile)
			else:
				azimuth-=event.relative.x*.005
				elevation=clampf(elevation+event.relative.y*.004,.23,1.35)
			_update_camera()
	if event is InputEventKey and event.pressed and not event.echo:
		match event.keycode:
			KEY_R: build_rotation=(build_rotation+1)%4;_clear(ghost);ghost_type="";_update_ghost()
			KEY_Q: azimuth-=PI/4;_update_camera()
			KEY_E: azimuth+=PI/4;_update_camera()
			KEY_C: roofs=not roofs;_update_roof_nodes(object_root)
			KEY_SPACE: paused=not paused
			KEY_HOME:target=Vector3.ZERO;zoom=34;azimuth=.73;elevation=.8;_update_camera()
			KEY_ESCAPE:tool="explore";selected=-1;ghost.visible=false
			KEY_1:tool="explore"
			KEY_2:tool="floor"
			KEY_3:tool="build"
			KEY_4:tool="remove"
	if event is InputEventScreenTouch:
		if event.pressed:touches[event.index]=event.position;drag_origin=event.position;drag_length=0
		else:
			if touches.size()==1 and drag_length<10:_click(event.position)
			touches.erase(event.index);touch_distance=0
	if event is InputEventScreenDrag:
		touches[event.index]=event.position;drag_length+=event.relative.length()
		if touches.size()==2:
			var points=touches.values();var distance:float=points[0].distance_to(points[1])
			if touch_distance>0:zoom=clampf(zoom*touch_distance/maxf(distance,1),.7,450)
			touch_distance=distance
		else:azimuth-=event.relative.x*.005;elevation=clampf(elevation+event.relative.y*.004,.23,1.35)
		_update_camera()

func _update_ghost() -> void:
	ghost.visible=tool in ["build","floor"]
	if not ghost.visible:return
	var type:=chosen if tool=="build" else "floor_"+floor_style
	if ghost_type!=type:
		_clear(ghost)
		if tool=="build":ghost.add_child(_build_facility({"type":chosen,"x":0,"z":0,"rot":build_rotation}))
		else:ghost.add_child(_model("res://assets/spa/"+type+".glb"))
		ghost_type=type
	var dims:=_dimensions(definitions[chosen],build_rotation) if tool=="build" else Vector2i.ONE
	if tool=="build":
		var n:Node3D=ghost.get_child(0);n.position=Vector3(dims.x*TILE*.5,.06,dims.y*TILE*.5)
	ghost.position=Vector3(hover_tile.x*TILE,.04,hover_tile.y*TILE)
	if tool=="floor":ghost.position+=Vector3(TILE*.5,0,TILE*.5)
	hover_valid=_can_place(chosen,hover_tile,build_rotation) if tool=="build" else _can_paint(hover_tile)
	_ghost_color(ghost,Color(.55,.8,.65,.5) if hover_valid else Color(.85,.4,.3,.5))

func _ghost_color(node: Node, color: Color) -> void:
	if node is MeshInstance3D:
		var mat:=StandardMaterial3D.new();mat.albedo_color=color;mat.transparency=BaseMaterial3D.TRANSPARENCY_ALPHA;mat.shading_mode=BaseMaterial3D.SHADING_MODE_UNSHADED
		node.material_override=mat;node.cast_shadow=GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	if node is CPUParticles3D:node.emitting=false
	for c in node.get_children():_ghost_color(c,color)

func _click(screen: Vector2) -> void:
	if tool in ["explore","remove"]:
		var query:=PhysicsRayQueryParameters3D.create(camera.project_ray_origin(screen),camera.project_ray_origin(screen)+camera.project_ray_normal(screen)*1500)
		var result:=get_world_3d().direct_space_state.intersect_ray(query)
		if not result.is_empty() and result.collider.has_meta("facility"):
			var id:int=result.collider.get_meta("facility")
			var o=_object_by_id(id)
			if tool=="remove" and o!=null:_remove_at(Vector2i(o.x,o.z))
			else:selected=id;_send_state()
			return
	var hit=_ground_at(screen)
	if hit==null:return
	var cell:=Vector2i(floori(hit.x/TILE),floori(hit.z/TILE))
	match tool:
		"build":_place(chosen,cell,build_rotation)
		"floor":_paint_floor(cell)
		"remove":_remove_at(cell)
		_:selected=_id_at(cell);_send_state()

func _id_at(cell: Vector2i) -> int:
	if occupancy.has(cell):return int(occupancy[cell])
	for o in objects:
		if cell in _occupied_cells(o):return int(o.id)
	return -1

func _remember() -> void:
	undo_stack.append(_snapshot())
	if undo_stack.size()>25:undo_stack.pop_front()

func _place(type: String, cell: Vector2i, rot: int) -> void:
	if not _can_place(type,cell,rot):last_message="Choose empty floor tiles for this furnishing.";return
	var price:float=definitions[type].price
	if not free_build and money<price:last_message="This furnishing costs $%d. Let your guests earn a little more."%price;return
	_remember()
	_add_object(type,cell,rot)
	if not free_build:money-=price
	last_message=definitions[type].name+" added."
	_rebuild();_save()

func _can_paint(cell: Vector2i) -> bool:
	if floors.has(cell):return true
	if floors.size()>=2500:return false
	for d in NEIGHBORS:
		if floors.has(cell+d):return true
	return false

func _paint_floor(cell: Vector2i) -> void:
	if floors.get(cell)==floor_style:return
	if not _can_paint(cell):last_message="Extend from the edge of your existing floor.";return
	if not free_build and money<35:last_message="A floor tile costs $35.";return
	_remember();floors[cell]=floor_style
	if not free_build:money-=35
	last_message="Floor extended."
	_rebuild();_reroute_guests();_save()

func _remove_at(cell: Vector2i) -> void:
	var id:int=_id_at(cell)
	if id>=0:
		_remember()
		for i in range(objects.size()):
			if objects[i].id==id:
				if not free_build:money+=float(definitions[objects[i].type].price)*.7
				objects.remove_at(i);break
		selected=-1;last_message="Furnishing removed."
	elif floors.has(cell):
		if floors.size()<2:return
		var remaining:=floors.duplicate();remaining.erase(cell)
		var seen:Dictionary={};var queue:Array=[remaining.keys()[0]]
		while not queue.is_empty():
			var p:Vector2i=queue.pop_front()
			if seen.has(p):continue
			seen[p]=true
			for d in NEIGHBORS:
				if remaining.has(p+d) and not seen.has(p+d):queue.append(p+d)
		if seen.size()!=remaining.size():last_message="Keep your floor connected so guests can reach it.";return
		_remember();floors.erase(cell);last_message="Floor removed."
	else:return
	_rebuild();_reroute_guests();_save()

func _entry() -> Variant:
	for o in objects:
		if o.type=="cashier":
			var cells:=_access_cells(o)
			if cells.size()>0:return cells[0]
	return null

func _access_cells(o: Dictionary) -> Array:
	var dims:=_dimensions(definitions[o.type],o.rot)
	var result:Array=[]
	# Reception and rooms are entered from their open front, avoiding the trapped
	# service gap behind a counter and the solid backs of spa pavilions.
	var front:Array=[]
	if o.rot%2==0:
		for x in range(dims.x):front.append(Vector2i(o.x+x,o.z+dims.y if o.rot==0 else o.z-1))
	else:
		for z in range(dims.y):front.append(Vector2i(o.x+dims.x if o.rot==1 else o.x-1,o.z+z))
	for p in front:
		if floors.has(p) and not occupancy.has(p):result.append(p)
	if definitions[o.type].cat=="rooms" or o.type=="cashier":return result
	for x in range(dims.x):
		for z in [o.z-1,o.z+dims.y]:
			var p:=Vector2i(o.x+x,z)
			if floors.has(p) and not occupancy.has(p) and p not in result:result.append(p)
	for z in range(dims.y):
		for x in [o.x-1,o.x+dims.x]:
			var p:=Vector2i(x,o.z+z)
			if floors.has(p) and not occupancy.has(p) and p not in result:result.append(p)
	return result

func _route(start: Vector2i, end: Vector2i) -> Array:
	if start==end:return [end]
	var previous:Dictionary={start:start};var queue:Array=[start];var at:=0
	while at<queue.size():
		var p:Vector2i=queue[at];at+=1
		for d in NEIGHBORS:
			var q:Vector2i=p+d
			if previous.has(q) or not floors.has(q) or occupancy.has(q):continue
			previous[q]=p
			if q==end:
				var path:Array=[q];var c:Vector2i=q
				while c!=start:c=previous[c];path.push_front(c)
				return path
			queue.append(q)
	return []

func _cell_position(p: Vector2i) -> Vector3:
	return Vector3((p.x+.5)*TILE,.015,(p.y+.5)*TILE)

func _spawn_guest() -> void:
	var entry=_entry()
	if entry==null or guests.size()>=18:return
	var avatar:=_model("res://assets/kaykit/characters/guest.glb")
	avatar.scale=Vector3.ONE*.72
	avatar.position=_cell_position(entry)
	var colors:=[Color("dcd1b7"),Color("9baa96"),Color("bd9380"),Color("83a59b")]
	_tint_meshes(avatar,colors[rng.randi_range(0,3)],true)
	guest_root.add_child(avatar)
	var g:Dictionary={"node":avatar,"cell":entry,"path":[],"target":-1,"state":"arrive","timer":1.8,"used":0,"last":-1,"mood":rng.randf_range(65,80),"preference":rng.randi_range(0,2),"animation":""}
	guests.append(g);_animate(g,"Idle")

func _animate(g: Dictionary, name: String) -> void:
	if g.animation==name:return
	var player:=_find_animation(g.node)
	if player:
		if player.has_animation(name):
			var animation:=player.get_animation(name)
			animation.loop_mode=Animation.LOOP_LINEAR
			player.play(name,.25)
		else:
			for key in player.get_animation_list():
				if str(key).ends_with(name):player.get_animation(key).loop_mode=Animation.LOOP_LINEAR;player.play(key,.25);break
	g.animation=name

func _find_animation(node: Node) -> AnimationPlayer:
	if node is AnimationPlayer:return node
	for c in node.get_children():
		var a:=_find_animation(c)
		if a:return a
	return null

func _object_by_id(id: int) -> Variant:
	for o in objects:
		if o.id==id:return o
	return null

func _quality(o: Dictionary) -> float:
	var a:Dictionary=definitions[o.type]
	var greenery:=0.0
	for other in objects:
		if definitions[other.type].cat=="garden" and Vector2(other.x-o.x,other.z-o.z).length()<5:greenery+=2
	var occupied:=0
	for g in guests:
		if g.target==o.id:occupied+=1
	var support:=0.0
	for other in objects:
		if other.type in ["toilet","changing"]:support+=2
	return clampf(float(a.quality)*(.58+float(o.clean)*.0042)+minf(greenery,10)+minf(support,4)-occupied*1.8,20,100)

func _choose_facility(g: Dictionary) -> void:
	if g.used>=4:
		var entry=_entry()
		if entry!=null:
			g.path=_route(g.cell,entry);g.state="leave";g.target=-1;_animate(g,"Walking_A");return
	var choices:Array=[];var sum:=0.0
	for o in objects:
		var a:Dictionary=definitions[o.type]
		if a.cat=="garden" or o.type in ["cashier","rug","bookshelf","cabinet","teatable","table","chair"] or o.id==g.last:continue
		var occupied:=0
		for visitor in guests:
			if visitor.target==o.id:occupied+=1
		if occupied>=int(a.capacity):continue
		var best:Array=[]
		for access in _access_cells(o):
			var path:=_route(g.cell,access)
			if path.size()>0 and (best.is_empty() or path.size()<best.size()):best=path
		if best.is_empty():continue
		var weight:=pow(_quality(o)/60.0,3.2)/(1+best.size()*.045)
		if a.cat==["water","rooms","living"][g.preference]:weight*=1.8
		choices.append({"object":o,"path":best,"weight":weight});sum+=weight
	if choices.is_empty():g.state="rest";g.timer=3;_animate(g,"Idle");return
	var pick:=rng.randf()*sum
	for choice in choices:
		pick-=choice.weight
		if pick<=0:
			g.target=choice.object.id;g.path=choice.path;g.state="walk";_animate(g,"Walking_A");return

func _begin_use(g: Dictionary) -> void:
	var o=_object_by_id(g.target)
	if o==null:g.state="rest";g.timer=1;return
	var a:Dictionary=definitions[o.type]
	g.state="use";g.timer=rng.randf_range(7,13)
	var dims:=_dimensions(a,o.rot)
	var center:=Vector3((o.x+dims.x*.5)*TILE,.02,(o.z+dims.y*.5)*TILE)
	var seat:=0
	for other in guests:
		if other!=g and other.target==g.target and other.state=="use":seat+=1
	if a.cat=="water" and o.type!="ice":
		var offset:=Vector3((seat%3-1)*minf(1.3,float(a.w)*.3),.36,(-.55 if seat<3 else .55))
		g.node.position=center+offset.rotated(Vector3.UP,o.rot*PI*.5);_animate(g,"Sit_Floor_Idle")
	elif o.type in ["sofa","pinksofa","armchair","quiet","lounger","steam","sauna"]:
		var offset:=Vector3((seat-1.5)*.85 if int(a.capacity)>2 else seat*.8-.3,.45,-1.2 if o.type in ["steam","sauna"] else 0)
		g.node.position=center+offset.rotated(Vector3.UP,o.rot*PI*.5);_animate(g,"Sit_Chair_Idle")
	else:_animate(g,"Interact" if o.type in ["cafe","bar","changing"] else "Idle")
	g.node.rotation.y=o.rot*PI*.5

func _simulate(delta: float) -> void:
	spawn_clock+=delta
	if spawn_clock>7.5:
		spawn_clock=0;_spawn_guest()
	for i in range(guests.size()-1,-1,-1):
		var g:Dictionary=guests[i]
		if g.state in ["walk","leave"]:
			if g.path.is_empty():
				if g.state=="leave":g.node.queue_free();guests.remove_at(i);continue
				_begin_use(g);continue
			var p:Vector2i=g.path[0]
			var destination:=_cell_position(p)
			var difference:Vector3=destination-g.node.position
			difference.y=0
			if difference.length()<.12:
				g.cell=p;g.path.pop_front()
			else:
				g.node.position=g.node.position.move_toward(destination,delta*1.45)
				g.node.rotation.y=lerp_angle(g.node.rotation.y,atan2(difference.x,difference.z),minf(1,delta*7))
		else:
			g.timer-=delta
			if g.timer>0:continue
			if g.state=="use":
				var o=_object_by_id(g.target)
				if o!=null:
					var quality:=_quality(o)
					var revenue:=roundf(8+quality*.25)
					money+=revenue;earned+=revenue;visits+=1;o.uses+=1;o.clean=maxf(10,o.clean-1.4)
					g.mood=lerpf(g.mood,quality,.35);happiness=lerpf(happiness,g.mood,.12)
				g.used+=1;g.last=g.target;g.target=-1
				g.node.position=_cell_position(g.cell)
			_choose_facility(g)

func _clear_guests() -> void:
	guests.clear();_clear(guest_root)

func _reroute_guests() -> void:
	# A structural edit invalidates old paths and reservations. Visitors restart at reception.
	_clear_guests();spawn_clock=5

func _process(delta: float) -> void:
	time+=delta;state_clock+=delta;save_clock+=delta
	if not paused and not gallery_active:_simulate(minf(delta,2.0))
	if js_available and state_clock>.18:
		state_clock=0
		var raw=JavaScriptBridge.eval("JSON.stringify((window.spaCommands||[]).splice(0))",true)
		var commands=JSON.parse_string(str(raw))
		if commands is Array:
			for command in commands:_command(command)
		_send_state()
	if save_clock>20:save_clock=0;_save()

func _command(c: Dictionary) -> void:
	revision+=1
	var action:String=c.get("action","")
	var data:Dictionary=c.get("data",{})
	match action:
		"tool":tool=data.get("tool","explore");selected=-1;_clear(ghost);ghost_type="";_update_roof_nodes(object_root)
		"choose":
			if definitions.has(data.get("id","")):chosen=data.id;tool="build";selected=-1;_clear(ghost);ghost_type="";_update_roof_nodes(object_root)
		"floor":floor_style=data.get("style","stone");tool="floor";_clear(ghost);ghost_type=""
		"rotate":build_rotation=(build_rotation+1)%4;_clear(ghost);ghost_type=""
		"orbit":azimuth+=float(data.get("amount",PI/4));_update_camera()
		"zoom":zoom=clampf(zoom*float(data.get("factor",1)),.7,450);_update_camera()
		"home":target=Vector3.ZERO;zoom=40 if floors.size()>150 else 34;azimuth=.73;elevation=.8;_update_camera()
		"pause":paused=not paused
		"budget":free_build=not free_build;last_message="Free building enabled." if free_build else "Budget mode enabled. Guests fund your next additions.";_save()
		"roofs":roofs=not roofs;_update_roof_nodes(object_root)
		"light":
			lighting=data.get("name","morning")
			if lighting=="evening":sun.light_color=Color("efb887");sun.light_energy=.21;sun.rotation_degrees.x=-23;environment.environment.ambient_light_color=Color("bfcbd4")
			elif lighting=="golden":sun.light_color=Color("ffdaa6");sun.light_energy=.32;sun.rotation_degrees.x=-33;environment.environment.ambient_light_color=Color("dddcca")
			else:sun.light_color=Color("fff0d5");sun.light_energy=.34;sun.rotation_degrees.x=-48;environment.environment.ambient_light_color=Color("e9e4d7")
		"detail":
			detail=data.get("name","balanced")
			sun.shadow_enabled=detail!="simple"
			RenderingServer.directional_shadow_atlas_set_size(4096 if detail=="lush" else 2048,true)
			get_viewport().msaa_3d=Viewport.MSAA_DISABLED if detail=="simple" else Viewport.MSAA_4X
		"save":_save();last_message="Your spa is saved in this browser."
		"export":
			if js_available:JavaScriptBridge.eval("window.spaDownload("+JSON.stringify(_snapshot())+")",true)
		"import":
			var imported=data.get("save")
			if _valid_save(imported):_remember();_load_save(imported);_rebuild();_save();last_message="Your spa has been imported."
			else:last_message="This file is not a valid Stillwater Godot save."
		"reset":_remember();_reset(false);_rebuild();_save()
		"example":_remember();_reset(true);_rebuild();_save()
		"undo":
			if not undo_stack.is_empty():_load_save(undo_stack.pop_back());_rebuild();_save();last_message="Last building change undone."
		"clean":
			var o=_object_by_id(selected)
			if o!=null:
				if not free_build and money<30:last_message="A refresh costs $30."
				else:
					o.clean=100
					if not free_build:money-=30
					last_message="Fresh towels, clean water. Ready for the next guest.";_save()
		"select":selected=int(data.get("id",-1))
		# These commands exercise actual placement/pathfinding in browser smoke checks.
		"place":_place(data.get("id",""),Vector2i(int(data.get("x",0)),int(data.get("z",0))),int(data.get("rot",0)))
		"paint":_paint_floor(Vector2i(int(data.get("x",0)),int(data.get("z",0))))
		"remove":_remove_at(Vector2i(int(data.get("x",0)),int(data.get("z",0))))
		"inspect":
			if js_available:
				var projections:Array=[]
				for p in floors:projections.append({"x":p.x,"z":p.y,"screen":_vector2(camera.unproject_position(_cell_position(p)))})
				JavaScriptBridge.eval("window.spaProjection="+JSON.stringify(projections),true)
		"advance":
			for i in range(clampi(int(data.get("seconds",1))*10,1,2400)):_simulate(.1)
		"view":
			zoom=clampf(float(data.get("zoom",zoom)),.7,450)
			azimuth=float(data.get("angle",azimuth));elevation=clampf(float(data.get("elevation",elevation)),.23,1.35)
			target=Vector3(float(data.get("x",target.x)),float(data.get("y",0)),float(data.get("z",target.z)))
			_update_camera()
		"art":
			sun.light_energy=float(data.get("sun",.72))
			environment.environment.ambient_light_energy=float(data.get("ambient",.32))
		"thumbnail":
			gallery_active=true
			for node in [floor_root,object_root,landscape,walls_root,lobby_roofs,guest_root,ghost]:node.visible=false
			_clear(gallery_root)
			var id:String=data.get("id","onsen")
			var a:Dictionary=definitions[id]
			var model:=_build_facility({"type":id,"x":0,"z":0,"rot":0})
			model.position=Vector3.ZERO;gallery_root.add_child(model)
			var tile:=_model("res://assets/spa/floor_stone.glb")
			tile.scale=Vector3(30,1,30);gallery_root.add_child(tile)
			zoom=maxf(5,maxf(float(a.w),float(a.d))*2.25)
			target=Vector3(0,.65,0);azimuth=.65;elevation=.7;_update_camera()
		"gallery_end":
			gallery_active=false;_clear(gallery_root)
			for node in [floor_root,object_root,landscape,walls_root,lobby_roofs,guest_root]:node.visible=true
			target=Vector3.ZERO;zoom=40;_update_camera()
	_update_ghost()
	_update_roof_nodes(lobby_roofs)

func _snapshot() -> Dictionary:
	var tiles:Array=[]
	for p in floors:tiles.append({"x":p.x,"z":p.y,"style":floors[p]})
	return {"version":2,"engine":"Godot","floors":tiles,"objects":objects.duplicate(true),"money":money,"earned":earned,"visits":visits,"happiness":happiness,"free":free_build,"camera":{"angle":azimuth,"elevation":elevation,"zoom":zoom,"x":target.x,"z":target.z}}

func _valid_save(save) -> bool:
	if not save is Dictionary or save.get("version")!=2 or not save.get("floors") is Array or not save.get("objects") is Array:return false
	if save.floors.size()<1 or save.floors.size()>2500 or save.objects.size()>1500:return false
	var tiles:Dictionary={};var cells:Dictionary={};var ids:Dictionary={}
	for p in save.floors:
		if not p is Dictionary or not p.get("x") is float and not p.get("x") is int:return false
		if not p.get("z") is float and not p.get("z") is int:return false
		if abs(p.x)>1000 or abs(p.z)>1000 or p.x!=int(p.x) or p.z!=int(p.z):return false
		if p.get("style") not in ["stone","wood","garden"]:return false
		var key:=Vector2i(int(p.x),int(p.z))
		if tiles.has(key):return false
		tiles[key]=true
	for o in save.objects:
		if not o is Dictionary or not definitions.has(o.get("type","")):return false
		for key in ["id","x","z","rot","uses"]:
			if not o.get(key) is int and not o.get(key) is float:return false
			if not is_finite(float(o[key])) or float(o[key])!=int(o[key]):return false
		if o.rot<0 or o.rot>3 or o.id<1 or ids.has(o.id) or not o.get("clean") is float and not o.get("clean") is int:return false
		ids[o.id]=true
		for p in _occupied_cells(o):
			if not tiles.has(p) or cells.has(p):return false
			if o.type!="rug":cells[p]=true
	var queue:Array=[tiles.keys()[0]];var seen:Dictionary={};var cursor:=0
	while cursor<queue.size():
		var p:Vector2i=queue[cursor];cursor+=1
		if seen.has(p):continue
		seen[p]=true
		for d in NEIGHBORS:
			if tiles.has(p+d) and not seen.has(p+d):queue.append(p+d)
	if seen.size()!=tiles.size():return false
	for key in ["money","earned","visits","happiness"]:
		if save.has(key) and (not save[key] is float and not save[key] is int):return false
		if save.has(key) and not is_finite(float(save[key])):return false
	if save.has("camera"):
		if not save.camera is Dictionary:return false
		for key in ["x","z","angle","elevation","zoom"]:
			if save.camera.has(key) and (not save.camera[key] is float and not save.camera[key] is int):return false
			if save.camera.has(key) and not is_finite(float(save.camera[key])):return false
	return true

func _load_save(save: Dictionary) -> void:
	floors.clear();objects=save.objects.duplicate(true);next_id=1;selected=-1
	for p in save.floors:floors[Vector2i(int(p.x),int(p.z))]=p.style
	for o in objects:
		o.id=int(o.id);o.x=int(o.x);o.z=int(o.z);o.rot=int(o.rot);o.uses=int(o.uses);o.clean=clampf(float(o.clean),0,100);next_id=maxi(next_id,o.id+1)
	money=clampf(float(save.get("money",12000)),0,1e12);earned=clampf(float(save.get("earned",0)),0,1e12);visits=int(save.get("visits",0));happiness=clampf(float(save.get("happiness",72)),0,100);free_build=bool(save.get("free",true))
	var view:Dictionary=save.get("camera",{})
	azimuth=float(view.get("angle",.73));elevation=clampf(float(view.get("elevation",.8)),.23,1.35);zoom=clampf(float(view.get("zoom",34)),.7,450);target=Vector3(float(view.get("x",0)),0,float(view.get("z",0)))
	_clear_guests();_update_occupancy()

func _save() -> void:
	var contents:=JSON.stringify(_snapshot())
	var file:=FileAccess.open(SAVE_PATH,FileAccess.WRITE)
	if file:
		file.store_string(contents)
		file.close() # Close before syncing: an open write buffer is not yet in the filesystem.
	if js_available:
		# Keep a synchronous browser mirror so an immediate refresh also restores
		# the newest state while Godot's asynchronous IndexedDB sync completes.
		JavaScriptBridge.eval("(()=>{try{localStorage.setItem('stillwater-godot-save-v2',"+JSON.stringify(contents)+");return true}catch(e){return false}})()",true)
		JavaScriptBridge.force_fs_sync()

func _vector2(v: Vector2) -> Array:return [v.x,v.y]

func _send_state() -> void:
	if not js_available:return
	var inspection:Dictionary={}
	var o=_object_by_id(selected)
	if o!=null:
		inspection=o.duplicate();inspection["quality"]=_quality(o)
	var state:Dictionary={"ready":true,"engine":"Godot 4.6.3","catalog":catalog,"tool":tool,"chosen":chosen,"rotation":build_rotation,"floorStyle":floor_style,"money":roundf(money),"earned":earned,"visits":visits,"happiness":roundf(happiness),"guests":guests.size(),"free":free_build,"paused":paused,"roofs":roofs,"light":lighting,"floors":floors.size(),"objects":objects,"inspection":inspection,"message":last_message,"zoom":zoom,"undo":undo_stack.size(),"viewport":[get_viewport().get_visible_rect().size.x,get_viewport().get_visible_rect().size.y],"fps":Engine.get_frames_per_second()}
	state["revision"]=revision
	state["art"]=[sun.light_energy,environment.environment.ambient_light_energy]
	state["detail"]=detail
	state["drawCalls"]=RenderingServer.get_rendering_info(RenderingServer.RENDERING_INFO_TOTAL_DRAW_CALLS_IN_FRAME)
	JavaScriptBridge.eval("window.spaState="+JSON.stringify(state)+";if(window.spaUpdate)window.spaUpdate(window.spaState)",true)
