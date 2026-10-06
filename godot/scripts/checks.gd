extends SceneTree
## Integration checks run the same scene, placement and simulation used on the website.
func _initialize() -> void:
	call_deferred("run")

func run() -> void:
	var game=load("res://scripts/spa.gd").new()
	root.add_child(game)
	await process_frame
	game.set_process(false)
	game._reset(false);game._rebuild();game.rng.seed=17
	assert(game.catalog.size()==38,"Complete public-asset catalog")
	assert(game.objects.size()==9,"A new spa begins with its furnished lobby")
	assert(game._entry()!=null,"Reception has an accessible front")
	assert(not game._can_place("onsen",Vector2i(-6,-4),0),"Occupied tiles reject placement")
	assert(not game._can_place("pool",Vector2i(4,2),0),"Facilities must fit on floor")
	game.free_build=false
	var balance:float=game.money
	game._place("onsen",Vector2i(0,-4),0)
	assert(game.money==balance-850,"Budget construction charges once")
	game._place("onsen",Vector2i(0,-4),0)
	assert(game.money==balance-850,"Invalid placement cannot charge again")
	game._place("sauna",Vector2i(3,0),0)
	for i in range(1800):game._simulate(.1)
	assert(game.visits>8 and game.earned>150,"Visitors reach facilities, use them, and earn real revenue")
	assert(game.objects[9].uses>0,"A bath receives completed visits")
	var save:Dictionary=game._snapshot()
	assert(game._valid_save(save),"A real layout survives save validation")
	game._reset(false);game._load_save(save)
	assert(game.objects.size()==11 and game.visits==save.visits,"Loading restores layout and progress")
	var invalid:Dictionary=save.duplicate(true)
	invalid.objects[0].type="missing-model"
	assert(not game._valid_save(invalid),"Unknown imported facilities are rejected")
	invalid=save.duplicate(true);invalid.floors.append({"x":100,"z":100,"style":"stone"})
	assert(not game._valid_save(invalid),"Disconnected imported floors are rejected")
	invalid=save.duplicate(true);invalid.camera.zoom="huge"
	assert(not game._valid_save(invalid),"Invalid imported camera data is rejected")
	var before:float=game.money
	game._remove_at(Vector2i(0,-4))
	assert(game.money==before+595,"Removing a furnishing refunds 70 percent")
	assert(game.guests.is_empty(),"Structural changes clear obsolete guest routes")
	game._load_save(game.undo_stack.pop_back())
	assert(game.objects.size()==11,"Undo restores the last construction state")
	# Two otherwise identical baths compete through the actual weighted choice code.
	game._reset(false);game._place("onsen",Vector2i(0,-4),0);game._place("onsen",Vector2i(0,0),0)
	game.objects[-1].clean=10
	var clean:int=game.objects[-2].id;var dirty:int=game.objects[-1].id
	var counts:Dictionary={clean:0,dirty:0}
	game._spawn_guest();var guest:Dictionary=game.guests[0]
	guest.preference=0
	for i in range(350):
		guest.cell=game._entry();guest.last=-1;guest.used=0;guest.target=-1
		game._choose_facility(guest)
		if counts.has(guest.target):counts[guest.target]+=1
	assert(counts[clean]>counts[dirty]*1.5,"Clean, high-quality facilities attract more real choices")
	print("PASS: placement, collision, budgeting, navigation, completed visits, revenue, save/import validation, refunds, undo and quality-driven choices. Counts: ",counts)
	quit(0)
