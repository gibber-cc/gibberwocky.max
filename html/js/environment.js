// singleton 
let Gibber = null,
    CodeMirror = require( 'codemirror' )

require( '../node_modules/codemirror/mode/javascript/javascript.js' )
require( '../node_modules/codemirror/addon/edit/matchbrackets.js' )
require( '../node_modules/codemirror/addon/edit/closebrackets.js' )
require( '../node_modules/codemirror/addon/hint/show-hint.js' )
require( '../node_modules/codemirror/addon/hint/javascript-hint.js' )

require( './tabs-standalone.microlib-latest.js' )

let Environment = {
  codeMarkup: require( './codeMarkup.js' ),
  debug: false,
  _codemirror: CodeMirror,
  animationScheduler: require( './animationScheduler.js' ),
  consoleDiv:null,
  consoleList:null,

  init( gibber ) {
    Gibber = gibber

    this.createCodeMirror()   
    this.createSidePanel()
    this.setupSplit()
    this.sidebar = document.querySelector( '#sidebar' )
    this.sidebar.isVisible = 1
    this.animationScheduler.init()
    this.editorWidth = document.querySelector( '#editor' ).style.width
  },

  createSidePanel() {
    this.tabs = new ML.Tabs( '#tabs' )

    this.createConsole()
    this.createDemoList()
  },
  
  setupSplit() {
    let splitDiv = document.querySelector( '#splitBar' ),
        editor   = document.querySelector( '#editor'   ),
        sidebar  = document.querySelector( '#sidebar'  ),
        mousemove, mouseup

    mouseup = evt => {
      window.removeEventListener( 'mousemove', mousemove )
      window.removeEventListener( 'mouseup', mouseup )
    }

    mousemove = evt => {
      let splitPos = evt.clientX

      editor.style.width = splitPos + 'px'
      sidebar.style.left = splitPos  + 'px'
      sidebar.style.width = (window.innerWidth - splitPos) + 'px'
    }

    splitDiv.addEventListener( 'mousedown', evt => {
      window.addEventListener( 'mousemove', mousemove )
      window.addEventListener( 'mouseup', mouseup )
    })

  },

  createCodeMirror() {
    CodeMirror.keyMap.gibber = this.keymap
    this.codemirror = CodeMirror( document.querySelector('#editor'), {
      mode:'javascript', 
      keyMap:'gibber',
      autofocus:true, 
      value: Gibber.Examples.default,
      matchBrackets: true,
      autoCloseBrackets: true,
      extraKeys: {"Ctrl-Space": "autocomplete"},
      //theme:'the-matrix'
    })
    this.codemirror.setSize( null, '100%' ) 
  },

  createConsole() {
    
    //this.console = //CodeMirror( document.querySelector('#console'), { mode:'javascript', autofocus:false, lineWrapping:true })
    //this.console.setSize( null, '100%' )

    let list = document.createElement( 'ul' )

    list.setAttribute( 'id', 'console_list' )

    Environment.consoleList = list
    Environment.consoleDiv = document.querySelector( '#console' )

    Environment.consoleDiv.appendChild( list )
    
    Environment.overrideError()
  },

  overrideError() {
    console.__error = console.error
    console.error = function(...args) {
      Gibber.Environment.error.apply( null, args )
      console.__error.apply( console, args )
    }
  },

  replaceError() {
    console.error = console.__error
  },

  createDemoList() {
    let container = document.querySelector('#demos'),
        list = document.createElement( 'ul' )

    for( let demoName in Gibber.Examples ) {
      let li = document.createElement( 'li' ),
          txt = Gibber.Examples[ demoName ]
      
      li.innerText = demoName 

      li.addEventListener( 'click', () => {
        Environment.codemirror.setValue( txt )
      })
      
      list.appendChild( li )
    }
    
    container.innerHTML = ''
    container.appendChild( list )
  },

  log( ...args ) {
    let consoleItem = Environment.createConsoleItem( args )
    Environment.consoleList.appendChild( consoleItem )
    consoleItem.scrollIntoView()

    return consoleItem
  },

  error( ...args ) {
    let consoleItem = Environment.createConsoleItem( args )
    
    consoleItem.setAttribute( 'class', 'console_error' )

    Environment.consoleList.appendChild( consoleItem )
    consoleItem.scrollIntoView()
  },
  
  createConsoleItem( args ) {
    let li = document.createElement( 'li' )
    li.innerText = args.join( ' ' )

    return li
  },

  clearConsole() {
    document.querySelector( '#console_list' ).innerHTML = ''
  },

  keymap : {
    fallthrough:'default',

    'Ctrl-Enter'( cm ) {
      try {
        let selectedCode = Environment.getSelectionCodeColumn( cm, false )

        Environment.flash( cm, selectedCode.selection )
        
        let func = new Function( selectedCode.code ),
            markupFunction = () => { 
              Environment.codeMarkup.process( 
                selectedCode.code, 
                selectedCode.selection, 
                cm, 
                Gibber.Max//Gibber.MIDI.channels[0]
              ) 
            }
        
        markupFunction.origin  = func

        if( !Environment.debug ) {
          Gibber.Scheduler.functionsToExecute.push( func );
          Gibber.Scheduler.functionsToExecute.push( markupFunction  )
        }else{
          func()
          markupFunction()
        }
      } catch (e) {
        console.log( e )
        Environment.log( 'ERROR', e )
      }
    },
    'Alt-Enter'( cm ) {
      try {
        let selectedCode = Environment.getSelectionCodeColumn( cm, true )

        Environment.flash( cm, selectedCode.selection )
        
        let func = new Function( selectedCode.code ),
            markupFunction = () => { 
              Environment.codeMarkup.process( 
                selectedCode.code, 
                selectedCode.selection, 
                cm, 
                Gibber.Max//Gibber.MIDI.channels[0]
              ) 
            }
        
        markupFunction.origin  = func

        if( !Environment.debug ) {
          Gibber.Scheduler.functionsToExecute.push( func );
          Gibber.Scheduler.functionsToExecute.push( markupFunction  )
        }else{
          func()
          markupFunction()
        }
      } catch (e) {
        console.log( e )
        Environment.log( 'ERROR', e )
      }
    },
    'Ctrl-.'( cm ) {
      Gibber.clear()
      Gibber.log( 'All sequencers stopped.' )
    },
    'Shift-Ctrl-C'( cm ) {
      Environment.sidebar.isVisible = !Environment.sidebar.isVisible
      let editor = document.querySelector( '#editor' )
      if( !Environment.sidebar.isVisible ) {
        Environment.editorWidth = editor.style.width
        editor.style.width = '100%'
      }else{
        editor.style.width = Environment.editorWidth
      }

      Environment.sidebar.style.display = Environment.sidebar.isVisible ? 'block' : 'none'
    }
  },

 	getSelectionCodeColumn( cm, findBlock ) {
		let pos = cm.getCursor(), 
				text = null
        
  	if( !findBlock ) {
      text = cm.getDoc().getSelection()

      if ( text === "") {
        text = cm.getLine( pos.line )
      }else{
        pos = { start: cm.getCursor('start'), end: cm.getCursor('end') }
        //pos = null
      }
    }else{
      let startline = pos.line, 
          endline = pos.line,
          pos1, pos2, sel
    
      while ( startline > 0 && cm.getLine( startline ) !== "" ) { startline-- }
      while ( endline < cm.lineCount() && cm.getLine( endline ) !== "" ) { endline++ }
    
      pos1 = { line: startline, ch: 0 }
      pos2 = { line: endline, ch: 0 }
    
      text = cm.getRange( pos1, pos2 )

      pos = { start: pos1, end: pos2 }
    }

    if( pos.start === undefined ) {
      let lineNumber = pos.line,
          start = 0,
          end = text.length

      pos = { start:{ line:lineNumber, ch:start }, end:{ line:lineNumber, ch: end } }
    }
	
		return { selection: pos, code: text }
	},

  flash(cm, pos) {
    let sel,
        cb = function() { sel.clear() }
  
    if (pos !== null) {
      if( pos.start ) { // if called from a findBlock keymap
        sel = cm.markText( pos.start, pos.end, { className:"CodeMirror-highlight" } );
      }else{ // called with single line
        sel = cm.markText( { line: pos.line, ch:0 }, { line: pos.line, ch:null }, { className: "CodeMirror-highlight" } )
      }
    }else{ // called with selected block
      sel = cm.markText( cm.getCursor(true), cm.getCursor(false), { className: "CodeMirror-highlight" } );
    }
  
    window.setTimeout(cb, 250);
  }
}

module.exports = Environment
