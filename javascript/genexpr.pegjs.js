/*
	This document implements the GenExpr grammar
	It uses the Parsing Expression Grammar formalism (PEG), 
	as implemented in [pegjs](http://pegjs.org/documentation).
	(For reference, [here's ES5 in pegjs](https://github.com/pegjs/pegjs/blob/master/examples/javascript.pegjs))
	
	The **grammar** is a list of named rules, beginning with "start"
	
	Each **rule** is defined as a pattern, optionally followed by an action (in braces)
	
	**Patterns** can use quoted strings, other rule names, and some operators
	E.g. (x)? makes x optional, (x)* matches zero or more, (x)+ matches 1 or more, (a / b) matches either a or b, [0-9] matches any digit, etc.
	Matches can be named, e.g. arg:expression matches the rule expression and names its result "arg"
	
	**Actions** are blocks of JavaScript code that will be run when a rule matches, with named arguments available as locals. In addition, the block of js code at the head of this document is also available, and a few other handy methods, such as text() for the original input.
	
	Structure of the document:
	- header block of helper functions (for use in rule actions)
	- start rule (main translation unit stuff)
	- declarations
	- statements
	- expressions
	- literals
	
	TODO:
	- comments are recognized, but not captured.
	- grammar-level errors
	- more AST sorting

*/

{
	/*
		PEG.js lets us define some helper functions in the header 
		(for use in rule actions)
	*/
	
	// operations of lower valued precedence will be nested deeper
	// e.g. a*b+c => (a*b)+c
	var operator_precedence = {
		"*": 1, "/": 1, "%": 1,
		"+": 2, "-": 2,
		"<<": 3, ">>": 3,
		"<=p": 4, ">=p": 4, "<p": 4, ">p": 4, 
		"<=": 4, ">=": 4, "<": 4, ">": 4,
		"==p": 5, "!=p": 5, "==": 5, "!=": 5,
		"&": 6, "^": 7, "|": 8,
		"&&": 9, "^^": 10, "||": 11,
	};
	
	// it turned out to be easier to normalize binexpr chains in this action step 
	// than dealing with the depth of rules the grammar would require
	function normalizeBinaryExpression(first, rest) {
		// start with the common two-arg case:
		var result = {
			type: "BinaryExpression",
			operator: rest[0].op,
			left: first,
			right: rest[0].val,
		};
		// now refine for multiple args according to precedence:
		for (var i=1; i<rest.length; i++) {
			var op0 = rest[i-1].op, 
				op1 = rest[i].op;
			if (operator_precedence[op0] <= operator_precedence[op1]) {
				// a,*b,+c => ((a*b)+c)
				result = {
					type: "BinaryExpression",
					operator: rest[i].op,
					left: result,
					right: rest[i].val,
				};
			} else {
				// a,+b,*c => (a+(b*c))
				result.right = {
					type: "BinaryExpression",
					operator: rest[i].op,
					left: result.right,
					right: rest[i].val,
				};
			}
		}
		return result;
	}
}

///////////////////// START RULE /////////////////////

/*
	GenExpr should allow either translation_unit or expression as valid start rules
	(so "in1*2" is a valid expr/codebox text)
	
	So when building the parser, pass these options: 
	{ allowedStartRules: [ "start", "translation_unit", "gen" ] }
	
	To evaluate a string as an expression (rather than a full translation unit):
	
	parser.parse(str, { startRule: "gen" });
*/

start
  = translation_unit

/*
	This rule works for a simple expression
	and it wraps it into a unit with "out1=<expr>".
	E.g. in gen a [expr in1*2]
*/
gen = _ expr:true_expression_list _ {
	// TODO: perhaps might need to handle expression lists
	// TODO: might need to handle references to inputs differently here
  	return {
  		"type": "GenExpression",
		"expressions": expr,
  	}
}

/*
	This is a full, normal entry point for a codebox of genexpr
*/
translation_unit
  = _ 
    //commands:compiler_command* 
    //functions:(function_declaration)* 
	decls:declarator*
  	body:expression_statement*
	_ {
		// decls is a list of lists, needs to be flattened:
  		decls = Array.prototype.concat.apply([], decls);  
  		return {
			//type: "TranslationUnit",
			//commands: commands,
			//functions: functions,
			decls: decls,
			body: body,
		};
	}

_ "whitespace" 
  = (comment / [ \t\n\r])*

newline
  = [\n\r\u2028\u2029]

// TODO: attach as leadingComments / trailingComments properties of the nearest node
comment 
  = multi_line_comment
  / single_line_comment
  
single_line_comment
  = "//" (!newline .)* newline?
  
multi_line_comment
  = "/*" (!"*/" .)* "*/"

///////////////////// DECLARATIONS /////////////////////
  
declarator
  = ty:fully_specified_type _ first:single_declaration rest:(_ "," _ d:single_declaration { return d; })* _ ";" _ {
		// push types into the VariableDeclaration nodes
		// and return them all as a list
  		var list = [first].concat(rest);
  		for (var i=0; i<list.length; i++) {
			var p = list[i];
			var init = [];
			if (p.init) init = p.init.arguments;
			list[i] = {
            	//type: "Declaration",
            	name: p.id.name,
            	object: ty.name,
            	"arguments": init,
			};
		}
  		return list;
  }
  
single_declaration
  = id:IDENTIFIER init:call_member_expression? {
  		return {
  			id:   id,
        	init: init
  		};
  }

fully_specified_type
  = type_specifier
  
type_specifier = IDENTIFIER

///////////////////// STATEMENTS /////////////////////

expression_statement
  = ";" _
  / expr:expression _ ";" _ { return expr; }

///////////////////// EXPRESSIONS /////////////////////

/*
Expressions are defined recursively, such that e.g. a unary_expression will satisfy the requirement of a binary_expression. The rule hierarchy looks like this:

	expression is assignment_expression 
	assignment_expression is itself, or true_expression
	true_expression is conditional_expression, or binary_expression
	binary_expression is itself, or unary_expression
	unary_expression is itself, or postfix_expression
	postfix_expression is itself, or primary_expression
	primary_expression is IDENTIFIER, LITERAL, or (nested expression)
*/

expression 
  = assignment_expression
  
/* 
	Note that GenExpr supports multiple assignments & multiple return values (MRVs).
	
	Also, GenExpr syntax stipulates that functions can return multiple items
	but in a chain of assignments, only the last item on the rhs will be interpreted in this way; other items on the rhs will be truncated to a single value. So,
	a, b, c = cartopol(x, y), cartopol(z, w);
	becomes:
	a = cartopol(x, y); b, c = cartopol(z, w);
	
*/
assignment_expression
  = left:left_hand _ operator:assignment_operator _ right:true_expression_list {
  	
  		if (left.length <= 1 && right.length <=1) {
  			return {
				type:     "SingleAssignment",
				operator: operator,
				left:     left[0],
				right:    right[0],
			};
  		} else {
  			return {
				type:     "MultipleAssignment",
				operator: operator,
				left:     left,
				right:    right,
			};
		}
    }
  / true_expression

left_hand = first:(OUTLET_IDENTIFIER / IDENTIFIER)
			rest:(_ "," _ expr:IDENTIFIER { return expr; })* {
	return [first].concat(rest);
}

assignment_operator = [-*+/%]? "=" { return text(); }

true_expression_list = first:true_expression 
			 rest:(_ "," _ expr:true_expression { return expr; })* {
	return [first].concat(rest);
}

  
// use true_expression wherever an assignent_expression would not be legal
true_expression 
 = conditional_expression  
 / binary_expression
 
conditional_expression
  = test:binary_expression _ "?" _ 
  	t:expression _ ":" _ 
  	f:expression {
  	  return {
        type:       "ConditionalExpression",
        test:       test,
        consequent: t,
        alternate:  f
      };
  }

binary_expression 
  = first:unary_expression rest:binary_right+ {
  		return normalizeBinaryExpression(first, rest);
  }
  / unary_expression

binary_right
  = _ op:binary_operator _ val:unary_expression { 
  	return {
  		op: op,
		val: val,
	};
  }

// watch out for a greedy parser -- that's why <= is listed before <
binary_operator
  = "<=p" / ">=p" / "<p" / ">p" / "<=" / ">=" / "<<" / ">>"
  / "==p" / "!=p" / "==" / "!=" / "&&" / "||" / "^^"
  / [-/+*%^&|<>]

unary_expression
  = postfix_expression
  / operator:[-!~] _ expr:unary_expression {
  	return {
        type:     "UnaryExpression",
        operator: operator,
        argument: expr,
        prefix:   true
      };
  }
  
postfix_expression 
  = object:primary_expression field:(
  	computed_member_expression 
  	/ literal_member_expression
  	/ call_member_expression
  )+ {
  		// now restructure here:
  		while (field.length > 0) {
  			if (field[0].type == "CallExpression") {
  				field[0].object = object;
  			} else {
  				field[0].object = object;
  			}
  			object = field.shift();
  		}
  		return object;
  }
  / primary_expression

computed_member_expression
  = _ "[" _ field:true_expression _ "]" {
  		return {
  		  type: "MemberExpression",
  		  computed: true,
          property: field,
        };
  }
literal_member_expression
  = _ "." _ field:IDENTIFIER {
  		return {
  		  type: "MemberExpression",
  		  computed: false,
          property: field,
        };
  }
  
call_member_expression
  = _ "(" _ args:call_expression_arguments? _ ")" {
  		return {
          type:     "CallExpression",
          arguments: args || [],
        };
  }
  
call_expression_arguments
  = argument_list
  
argument_list = first:argument 
            rest:(_ "," _ expr:argument { return expr; })* {
	// TODO: separate out the named arguments?
	return [first].concat(rest);
}
  
argument 
  = key:IDENTIFIER _ "=" _ expr:true_expression { 
	  return {
		type: "AssignmentExpression",
		operator: "=",
		left: key,
		right: expr,
		// non-estree:
		gen_kind: "attribute"
	  }
	}
	/ true_expression

primary_expression
  = OUTLET_IDENTIFIER
  / LITERAL_CONSTANT
  / IDENTIFIER 
  / LITERAL 
  / ( "(" expr:expression ")" ) { return expr }
  
// list of words that can't be used for identifiers
// because the grammar would break if they were
// (keep this list as short as possible)
// Infinity, NaN, ?
identifier_grammar_reserved
  = "return"
  / "continue"
  / "break"
  / "true"
  / "false"
  / "null"
  
OUTLET_IDENTIFIER
  = "out" idx:[0-9]* {
    idx = idx ? +idx : 1;
  	return {
  		type: "Outlet",
  		index: idx,
  	}
  }

IDENTIFIER
  = (!identifier_grammar_reserved) 
    first:[_a-z]i 
    rest:[_0-9a-z]i*  
    {
      	return { 
      		type: "ID", 
      		name: first + rest.join(""),
      		//raw: text()
      	};
    }
  
///////////////////// LITERALS /////////////////////
  
LITERAL
  = LITERAL_NULL / LITERAL_BOOL 
  / LITERAL_FLOAT / LITERAL_INTEGER
  / LITERAL_STRING

constant
  = ("HALFPI" / "halfpi") { return Math.PI/2; }
  / ("INVPI" / "invpi") { return 1/Math.PI; }
  / ("PI" / "pi") { return Math.PI; }
  / ("TWOPI" / "twopi") { return Math.PI*2; }
  / ("LN10" / "ln10") { return Math.LN10; }
  / ("LN2" / "ln2") { return Math.LN2; }
  / ("LOG10E" / "log10e") { return Math.LOG10E; }
  / ("LOG2E" / "log2e") { return Math.LOG2E; }
  / ("SQRT2" / "sqrt2") { return Math.SQRT2; }
  / ("SQRT1_2" / "sqrt1_2") { return Math.SQRT1_2; }
  / ("DEGTORAD" / "degtorad") { return Math.PI/180; }
  / ("RADTODEG" / "radtodeg") { return 180/Math.PI; }
  / ("E" / "e") { return Math.E; }
  
LITERAL_CONSTANT 
  = n:constant { 
	return { 
      	type: "FLOAT", 
      	value: n,
      	//raw: text(), 
      };
 }
  
LITERAL_INTEGER "Literal.Integer"
  = "0x"i $[0-9a-f]i+ {
      return { 
      	type: "INTEGER", 
      	value: parseInt(text(), 16),
      	//raw: text(), 
      };
     }
 // / [+-]? DecimalIntegerLiteral {
  / DecimalIntegerLiteral {
      return { 
      	type: "INTEGER", 
      	value: +text(),
      	//raw: text(), 
      };
     }

DecimalIntegerLiteral = "0" / NonZeroDigit DecimalDigit*
NonZeroDigit = [1-9]
DecimalDigit = [0-9]

LITERAL_FLOAT "Literal.Float"
  //= [+-]? (
  = (
  	("." DecimalDigit+ ExponentPart?)
  	/ (DecimalIntegerLiteral "." DecimalDigit* ExponentPart?)
  	/ (LITERAL_INTEGER ExponentPart)
  ) {
      return { 
      	type: "FLOAT", 
      	value: parseFloat(text()),
      	//raw: text(), 
      };
     }

ExponentPart = ("e"i [+-]? DecimalDigit+)

LITERAL_BOOL
  = "true"  { 
  		return { 
  			type: "BOOL", 
  			value: true,
  		}; 
  }
  / "false" { 
  		return { 
  			type: "BOOL", 
  			value: false, 
  		}; 
  }
  
LITERAL_NULL
  = "null"  { 
  		return { 
  			type: "NULL" 
  		};
  	}

// nothing fancy here -- no multi-line strings, no escape chars, hexcode, regex etc....
LITERAL_STRING
  = (('"' chars:[^'"']* '"') 
  / ("'" chars:[^"'"]* "'")) {
      	return { 
      		type: "STRING", 
      		value: text().substring(1, text().length-1),
      		//raw: text(), 
      	};
    }



