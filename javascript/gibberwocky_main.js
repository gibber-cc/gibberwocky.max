// see https://docs.cycling74.com/max7/vignettes/javascript_usage_topic
		
outlets = 3;		
	
var scene_dict = new Dict("gibberwocky_scene");
var patcher_dict = new Dict("gibberwocky_patcher");

var gen_boxes = [];
var out_boxes = [];
	
var transport = {
	bpm: 120,
	sig: "4/4",
	ply: 0,
};

function set_transport(key, val) { 
	transport[key] = val; 
}

function signals(n) {
	// create outlets:
	var num_signals = Math.min(32, Math.max(0, +n));
	
	// reset:
	gen_boxes = [];
	out_boxes = [];
	
	// locate the gate:
	var gibbergengate = this.patcher.getnamed("gibbergengate");
	
	// locate/create scripted objects:
	var i = 0;
	for (; i < 32; i++) {
		var gen = this.patcher.getnamed("gibbergen"+i);
		var out = this.patcher.getnamed("gibberout"+i);
		var left = 30 + i * 32;
		var top = 450 + i * 5;
			
		// connect gen patchers:
		if (i < num_signals) {
			if (!(gen && gen.valid)) {
				gen = this.patcher.newdefault(left, top, "poly~", "gibbergen"+i);
				gen.varname = "gibbergen"+i; 
				this.patcher.connect(gibbergengate,i,gen,0);
				
				// tell new subpatcher the id, for the sake of snapshots
				outlet(0, [i, "id", i]);
			}
			gen_boxes[i] = gen;
		} else {
			if (gen && gen.valid) {
				this.patcher.remove(gen);
			}
		}
		
		// connect outlets:
		if (i < num_signals) {
			if (!(out && out.valid)) {
				out = this.patcher.newdefault(left, top+30, "outlet");
				out.varname = "gibberout"+i; 
				this.patcher.connect(gen,0,out,0);
			}
			out_boxes[i] = out;
			
		} else {
			if (out && out.valid) {
				this.patcher.remove(out);
			}
		}
	}	
	
	bang();
}

// utils:
function find_box_by_varname(patcher, name) {
	for (i in patcher.boxes) {
		var box = patcher.boxes[i].box;
		if (box.varname == name) {
			return box;
		}
	}	
}

function find_box_by_id(patcher, name) {
	for (i in patcher.boxes) {
		var box = patcher.boxes[i].box;
		if (box.id == name) {
			return box;
		}
	}	
}

function find_connected_boxes(patcher, source, outlet, arr) {
	for (i in patcher.lines) {
		var line = patcher.lines[i].patchline;
		if (line.source[0] == source.id && line.source[1] == outlet) {
			var dst = find_box_by_id(patcher, line.destination[0]);
			arr.push(dst);
			
		}
	}
	return arr;
}

function parse_patcher(p, scene){

	if (p.filepath == ""){
		post("warning: gibberwocky can't analyze the patcher until it is saved\n");
		return;
	}

	var lines = new String();
	var patcher_file = new File(p.filepath);

	while (patcher_file.position != patcher_file.eof){
		lines += patcher_file.readline();
	}
	patcher_file.close();
	patcher_dict.parse(lines);

    var patcher = JSON.parse(lines).patcher;

	// find the [gibberwocky] object:
	var g = find_box_by_varname(patcher, "gibberwocky");
	if (!g) return;
	
	// find what it is connected to:
	var dsts = [];
	find_connected_boxes(patcher, g, 0, dsts);
	
	// for each one:
	for (var i=0; i<dsts.length; i++) {
		var text = dsts[i].text;
		var args = text.split(" ");
		var op = args.shift();
		switch(op) {
		case "route":
		case "routepass":
		case "select":
			// each arg is a namespace.
			scene.namespaces = scene.namespaces.concat(args);
			// continue from joined last outlet
			find_connected_boxes(patcher, dsts[i], dsts[i].numoutlets-1, dsts);
			break;
		}	
	}
}

function bang() {

	var patcher_dirname = patcher.filepath.match(/(.*)[\/\\]/)[1]||'';
	var package_dirname = patcher_dirname.match(/(.*)[\/\\]/)[1]||'';
	outlet(2, package_dirname);
	
	//if (lom_dict.get("busy") == 1) return;	// currently being written
	//lom_dict.set("busy", 1);
	
	// get entire API...
	var api = new LiveAPI("live_set");
	if (api.path !== undefined) {
		post("Running in M4L -- why not use Gibberwocky devices instead?\n");
	}
	
	// start from topmost patcher:
	var p = this.patcher;
	while (p.parentpatcher) { p = p.parentpatcher; }
	top_patcher = p;
	
	//for (var k in p) { post(k, p[k], "\n"); }
	//post("name", p.name, "\n");
	//post("filepath", p.filepath, "\n");
	
	// note also, getnamed
	// this.patcher.getnamed("steve").getvalueof();
	// this.patcher.getnamed("steve").setvalueof(...);
	// obj.message("sendbox", "patching_position", 300, 300);
	
	
	function explore(p, prefix) {
		
		var tree = {	
			type: "patcher",
			params: [],
		};
		
		var o = p.firstobject;
		if (!o) return;
	
		while (o) {
			var name = o.varname;
			var shortname = o.getattr("_parameter_shortname");
			
			if (name) {
				var path = prefix+name;
				var type_id = o.getattr("_parameter_type");
				var linknames = o.getattr("_parameter_linknames");
				var shortname = o.getattr("_parameter_shortname");
			
				if (o.maxclass == "patcher") {
					//post("recurse", o.varname + "::", o.subpatcher, "\n");
					tree[name] = explore(o.subpatcher(0), path + "::");
					
					// is this the gibberwocky?
					if (name == "gibberwocky") {
					
					}	
					
				} else {
					// force link?
					//o.message("_parameter_linknames", "1")
				
					
					
					if (o.maxclass == "max~") {
						var type;
						var value = o.getvalueof(); // nope, I get jsobject 0
						switch(type_id) {
							case 0: type = "float"; break;
							case 1: type = "int"; break;
							case 2: type = "enum"; break;
							case 3: type = "blob"; break;
							default: break;
						}
						
						var initial = o.getattr("_parameter_initial"); // null
						
						//post("amxd name:", name, "type:", type, "value:", value, typeof value,"initial:", initial, "\n");
						
						var guess = o.getattr("_parameter");
						
						//post(JSON.stringify(guess));
						
						
						// no use; the snapshot API doesn't give us parameter names.
						// there doesn't seem to be a way of handling blob.
						//var snap = new SnapshotAPI(name);
						//post(snap);
						//o.message("getparams");
						
						
						//patchername
						//post(value);
						
						//tree.params.push(o);
					
					} else if (type_id == undefined && type_id == null) {
						// it's not a live parameter
						
						//post("nonlive", name, o.maxclass, "\n");
						
						// what types can we handle?
						
						
					} else {
						var type;
						switch(type_id) {
							case 0: type = "float"; break;
							case 1: type = "int"; break;
							case 2: type = "enum"; break;
							case 3: type = "blob"; break;
							default: break;
						}
						var value = o.getvalueof();
						var range = o.getattr("_parameter_range");
						
						/*
						post(type, path,  shortname,
							o.getattr("_parameter_linknames") ? "linked" : "unlinked",
							"value: "+value,
							//o.getattr("_parameter_unitstyle"),
							"\n");
						*/
						
						// maybe want to store only if o.getattr("parameter_enable") == 1?
						var n = {
							varname: name,
							shortname: shortname,
							path: "parent::" + path,
							value: value,
							range: range,
							type: type,
						};
						
						tree.params.push(n);
					}
				} 
			
			} else {
			
				if (o.valid) {
					// not a scripted object:
					var maxclass = o.maxclass; // but no way to grab args... 
					//post(maxclass);
					switch (maxclass) {
						case "receive~": {
						
							break;
						}
						default:
				
					}
				}				
			}
			o = o.nextobject;
		}
		
		return tree;
	}
	
	var scene = {
		root: explore(p, ""),
		transport: transport,
		signals: [],
		namespaces: [],
	};
	
	for (var i in out_boxes) {
		scene.signals.push(i);
	}
	
	parse_patcher(top_patcher, scene);
		
	// set dict from js:
	scene_dict.parse(JSON.stringify(scene));
	
	// done:
	outlet(1, "bang");
}


