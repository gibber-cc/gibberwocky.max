
// see https://docs.cycling74.com/max7/vignettes/javascript_usage_topic

autowatch = 1;
outlets = 3;

var ast_dict = new Dict("ast");

function dirname(path) { return path.match(/(.*)[\/\\]/)[1]||''; }

function readfile(path) {
	var lines = [];
	var file = new File(path, "read");
	while (file.position != file.eof){
		lines.push( file.readline() );
		lines.push("\n");
	}
	file.close();
	return lines.join("");
}

uid = (function() {
	var id = 0;
	return function (prefix) {
		return prefix + (++id);
	}
})();

var peg = require("peg-0.10.0.min");
//post(peg, "version", peg.VERSION, "\n");
var grammar = readfile("genexpr.pegjs.js");
var parser = peg.generate(grammar);

/*
	Work through the AST to generate a data-flow representation
	
	Depth-first traversal of body
	Each created box will have named outlets
	(these map to box id and outlet index pair)
*/

// map gen ops to Max objects
var unary_aliases = {
	abs: "abs",
	cos: "cos", sin: "sin", tan: "tan", 
	acos: "acos", asin: "asin", atan: "atan", 
	cosh: "cosh", sinh: "sinh", tanh: "tanh",
	acosh: "acosh", asinh: "asinh", atanh: "atanh",
	fastcos: "cos", fastsin: "sin", fasttan: "tan",
	
}

var binary_aliases = {
	min: "minimum",
	max: "maximum",
	add: "+", sub: "-", rsub: "!-",
	mul: "*", div: "/", rdiv: "!/", mod: "%",
	and: "&&", or: "||",
	eq: "==", neq: "!=",
	gt: ">", gte: ">=", lt: "<", lte: "<=",
	atan2: "atan2",
	
}

function processAST(ast) {

	var p = patcher.getnamed("maxgen");
	if (p) { p = p.subpatcher(); }
	if (p) {
		p.apply(function(box) {
			p.remove(box);
			return true;
		});
	} else {
		p = patcher.newdefault(710,210,"p");
		p.varname = "maxgen";
		p = p.subpatcher();
	}
	var x = 10;
	var y = 10;
	
	var newbox = function(text, xoffset, varname) {
		xoffset = xoffset || 0;
		var b = p.newdefault(x+xoffset,y,text);
		if (varname) {
			b.varname = varname;
		} else {
			b.varname = uid("box");
		}
		y += 35;
		//x += 5;
		return b;
	}
	
	var make_inlet = function(index) {
		var i=inlets.length;
		for (; i<index; i++) {
			var o = newbox("inlet", i*5, "in"+index);
			inlets.push(o);
		}
		return inlets[index-1];
	}
	
	var make_outlet = function(index) {
		var i=outlets.length;
		for (; i<index; i++) {
			var o = newbox("outlet", i*5, "out"+index);
			outlets.push(o);
		}
		return outlets[index-1];
	}
	
	var inlets = [];
	var outlets = [];
	
	var in1 = make_inlet(1);
	var reset_button = newbox("button");
	p.connect(in1,0,reset_button,0);
	
	var make_unary = function(operator, a1) {
		var b = newbox([operator,"0."]);		
		p.connect(a1,0,b,0);
		return b;
	}
	
	var make_binary = function(operator, l, r) {
		var b1 = newbox(["t","b","f"], 25); // for 2nd inlet
		var b2 = newbox([operator,"0."]);
		p.connect(b1,0,b2,0);
		p.connect(b1,1,b2,1);
		
		
		p.connect(l,0,b2,0);
		p.connect(r,0,b1,0);
		
		return b2;
	}
	
	var visit = function(state, node) {
		switch(node.type) {
		case "STRING":
		case "FLOAT":
		case "INTEGER": {
			var b = newbox("message"); // or ["t", node.value]?
			b.message("set", node.value);
			p.connect(reset_button,0,b,0);
			return b;
		
		} break;
		
		case "Outlet": {
			var b = make_outlet(node.index); // or ["t", node.value]?
			return b;
		
		} break;
		
		case "BinaryExpression": {
			var l = visit(state, node.left);
			var r = visit(state, node.right);
			
			return make_binary(node.operator, l, r);
			
		} break;
		
		case "CallExpression": {
			var args = [];
			for (var i=0; i<node.arguments.length; i++) {
				var a = visit(state, node.arguments[i]);
				args[i] = a;
			}
			if (node.object.type == "ID") {
				var op = node.object.name;
				var unop = unary_aliases[op];
				var binop = binary_aliases[op];
				
				if (unop) {
					return make_unary(unop, args[0]);
				} else if (binop) {
					return make_binary(binop, args[0], args[1]);
				} else {
					switch (op) {		
						// TODO: 
						// noise			
						// hypot
						// degrees radians
						// floor ceil sign trunc fract
						// rmod
						// absdiff
						// gtep etc.
						// sah
						// step
						// rate				
						// time
						// samplerate
						// phasor
						// cycle
						// rate
						// accum
						// scale
						
						default:
							post("call to ", node.object.name, "NYI");
						
					}
				}
			} else {
				post("methods not yet implemented");
			}
		} break;
		
		case "SingleAssignment": {
			var op = node.operator;
			var r = visit(state, node.right);
			
			// LHS can only be a name, either outlet or identifier
			if (node.left.type == "Outlet") {
				var l = make_outlet(node.left.index);
				p.connect(r,0,l,0);
			} else {
				// TODO: replace existing alias to r
				post("TODO");
			}
			
		} break;
		default: 
			post("unhandled node type", node.type, "\n");
		}	
	};

	var state = {
		boxes_dict: {}, // key is object ID
		outlets_dict: {}, // key is outlet variable name, value is box/idx pair
		
		boxes: [],
		patchlines: [],
	};

	// deal with declarations first
	for (var i in ast.decls) {
		var decl = ast.decls[i];
	}
	
	// depth-first traversal of body:
	for (var i in ast.body) {
		visit(state, ast.body[i]);
		
	}
}

var t0 = Date.now();
var dt = 1;

function mix(a, b, t) { return a + t*(b-a); }

function bang() {
	// get dt
	var t = Date.now();
    var dt1 = t - t0;
    t0 = t;
    // maybe want to smooth dt...?
    dt = mix(dt, dt1, 0.1);
    
	// evaluate the current program
	outlet(0, dt);
}

function expr(code) {

	var ast = parser.parse(code);
	
	var state = processAST(ast);
	
	ast_dict.parse(JSON.stringify(ast));
	outlet(2, "bang");
	
}