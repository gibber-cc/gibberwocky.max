const acorn = require( 'acorn' )

const callDepths = [
  'SCORE',
  'THIS.METHOD',
  'THIS.METHOD.SEQ',
  'THIS.METHOD[ 0 ].SEQ',
  'THIS.METHOD.VALUES.REVERSE.SEQ',
  'THIS.METHOD[ 0 ].VALUES.REVERSE.SEQ',
  'CHANNELS[0].METHOD[ 0 ].VALUES.REVERSE.SEQ',  
  'CHANNELS[0].METHOD.SEQ',
  'CHANNELS[0].METHOD[0].SEQ',
  'CHANNELS[0].METHOD.VALUES.REVERSE.SEQ',
  'CHANNELS[0].METHOD[0].VALUES.REVERSE.SEQ'
]

const channelNames = [ 'this', 'channels', 'master', 'returns' ]

const Utility = require( './utility.js' )
const $ = Utility.create

let Marker = {
  genWidgets: { dirty:false },
  unassignedWidgets: {}, 

  _patternTypes: [ 'values', 'timings', 'index' ],

  prepareObject( obj ) {
    obj.markup = {
      textMarkers: {},
      cssClasses:  {} 
    }  
  },

  process( code, position, codemirror, channel ) {
    let shouldParse = code.includes( '.seq' ) || code.includes( 'Steps(' ) || code.includes( 'Score(' ),
        isGen = false

    if( !shouldParse ) { // check for gen~ assignment
      for( let ugen in Gibber.Gen.genish ) {
        let idx1 = code.indexOf( ugen+'(' ),
            idx2 = code.indexOf( ugen+' (' )

        if( idx1 + idx2 > -2 ) { 
          shouldParse = true
          isGen = true
          break;
        }
      }
      if( !isGen ) {
        for( let ugen in Gibber.Gen.composites ) {
        let idx1 = code.indexOf( ugen+'(' ),
            idx2 = code.indexOf( ugen+' (' )

        if( idx1 + idx2 > -2 ) { 
            shouldParse = true
            isGen = true
            break;
          }
        }
      }
    }

    if( !shouldParse ) return

    let tree = acorn.parse( code, { locations:true, ecmaVersion:6, directSourceFile:true } ).body
    
    for( let node of tree ) {
      if( node.type === 'ExpressionStatement' ) { // not control flow
        node.verticalOffset  = position.start.line
        node.horizontalOffset = position.horizontalOffset === undefined ? 0 : position.horizontalOffset
        try {
          if( isGen ) {
            this.processGen( node, codemirror, channel )
          }else{ 
            this._process[ node.type ]( node, codemirror, channel )
          }
        } catch( error ) {
          console.log( 'error processing annotation for', node.expression.type, error )
        }
      }
    }
  },
  
  processGen( node, cm, channel ) {
    // are we passing gen expression to cc function or are we storing it in a variable?
    let shouldDelayPlacement = false,
        variableName = null

    if( node.expression.type === 'AssignmentExpression' ) {
      shouldDelayPlacement = true
      variableName = node.expression.left.name
    }

    let ch = node.end, line = node.verticalOffset, start = ch - 1, end = node.end 
    
    cm.replaceRange( ') ', { line, ch:start }, { line, ch } )

    let widget = document.createElement( 'canvas' )
    widget.ctx = widget.getContext('2d')
    widget.style.display = 'inline-block'
    widget.style.verticalAlign = 'middle'
    widget.style.height = '1.1em'
    widget.style.width = '60px'
    widget.style.backgroundColor = 'transparent'
    widget.style.marginLeft = '.5em'
    widget.style.borderLeft = '1px solid #666'
    widget.style.borderRight = '1px solid #666'
    widget.setAttribute( 'width', 60 )
    widget.setAttribute( 'height', 13 )
    widget.ctx.fillStyle = 'rgba(46,50,53,1)'
    widget.ctx.strokeStyle = '#eee'
    widget.ctx.lineWidth = .5
    widget.gen = Gibber.Gen.lastConnected
    widget.values = []

    if( widget.gen !== undefined ) { // if gen has been assigned to cc
      let oldWidget = Marker.genWidgets[ widget.gen.ccnum ] 

      if( oldWidget !== undefined && oldWidget.parentNode !== undefined && oldWidget.parentNode !== null ) {
        oldWidget.parentNode.removeChild( oldWidget )
      } 

      Marker.genWidgets[ widget.gen.ccnum ] = widget
    }

    if( shouldDelayPlacement ) {
      window[ variableName ].__widget__ = widget

      widget.place = () => {
        widget.gen = Gibber.Gen.lastConnected

        if( widget.gen !== undefined ) { // if gen has been assigned to cc
          let oldWidget = Marker.genWidgets[ widget.gen.ccnum ] 

          // check to see if widget has already been used with this cc #
          // and if so, that it hasn't already been cleared (via ctrl-.)
          if( oldWidget !== undefined && oldWidget.parentNode !== undefined ) {
            console.log( oldWidget.parentNode )
            oldWidget.parentNode.removeChild( oldWidget )
          } 

          Marker.genWidgets[ widget.gen.ccnum ] = widget
        }
        widget.mark = cm.markText({ line, ch }, { line, ch:end+1 }, { replacedWith:widget })
      }
    }else{
      widget.mark = cm.markText({ line, ch }, { line, ch:end+1 }, { replacedWith:widget })
    }
  },

  updateWidget( id, value ) {
    let widget = Marker.genWidgets[ id ]
    if( widget === undefined ) return 

    widget.values.push( parseFloat( value ) )

    while( widget.values.length > 60 ) widget.values.shift()
    Marker.genWidgets.dirty = true
  },

  drawWidgets() {
    
    Marker.genWidgets.dirty = false

    for( let key in Marker.genWidgets ) {
      let widget = Marker.genWidgets[ key ]
      if( typeof widget === 'object' && widget.ctx !== undefined ) {
        widget.ctx.fillRect( 0,0, widget.width, widget.height )
        widget.ctx.beginPath()
        widget.ctx.moveTo( 0,  widget.height / 2 )
        for( let i = 0; i < widget.values.length; i++ ) {
          widget.ctx.lineTo( i, widget.height - (widget.values[ i ] / 127) * widget.height )
        }
        widget.ctx.stroke()
      }
    }
  },

  clear() {
    for( let key in Marker.genWidgets ) {
      let widget = Marker.genWidgets[ key ]
      if( typeof widget === 'object' ) {
        widget.mark.clear()
        //widget.parentNode.removeChild( widget )
      }
    }

    Marker.genWidgets = { dirty:false }
  },

  _process: {
    ExpressionStatement( expressionNode, codemirror, channel ){ 
      Marker._process[ expressionNode.expression.type ]( expressionNode, codemirror, channel )
    },

    AssignmentExpression: function( expressionNode, codemirror, channel ) {
      if( expressionNode.expression.right.type !== 'Literal' && Marker.functions[ expressionNode.expression.right.callee.name ] ) {

        Marker.functions[ expressionNode.expression.right.callee.name ]( 
          expressionNode.expression.right, 
          codemirror,
          channel,
          expressionNode.expression.left.name,
          expressionNode.verticalOffset,
          expressionNode.horizontalOffset
        )            
      }

    },

    CallExpression( expressionNode, codemirror, channel  ) {

      let [ components, depthOfCall, index ] = Marker._getCallExpressionHierarchy( expressionNode.expression ),
        args = expressionNode.expression.arguments,
        usesThis, targetPattern, isTrack, method, target
      
      // needed for when blocks are split up into individual nodes that are sent to this method
      let shouldParse = components.includes( 'seq' ) || components.includes( 'Steps' ) || components.includes( 'Score' )

      if( shouldParse === false ) return

      // if index is passed as argument to .seq call...
      if( args.length > 2 ) { index = args[ 2 ].value }
      
      //console.log( "depth of call", depthOfCall, components, index )
      let valuesPattern, timingsPattern, valuesNode, timingsNode
      
      switch( callDepths[ depthOfCall ] ) {
         case 'SCORE':
           //console.log( 'score no assignment?', components, expressionNode.expression )
           if( Marker.functions[ expressionNode.expression.callee.name ] ) {
             Marker.functions[ expressionNode.expression.callee.name ]( expressionNode.expression, codemirror, channel, expressionNode.verticalOffset )            
           }
           break;

         case 'THIS.METHOD': // also for calls to Score([]).start() 
           break;

         case 'THIS.METHOD.SEQ':
           if( components.includes( 'channels' ) ) { //expressionNode.expression.callee.object.object.type !== 'ThisExpression' ) {
             let objName = expressionNode.expression.callee.object.object.name

             channel = window[ objName ]
             method = channel[ components[ 1 ] ][ index ]
           }else if( components.includes( 'this' ) ){
             channel = Gibber.currentTrack
             method = channel[ components[ 1 ] ][ index ]
           }else{
             let objName = expressionNode.expression.callee.object.object.name

             channel = window[ components[0] ]
             method = channel[ components[ 1 ] ] 
           }

           if( !channel.markup ) { Marker.prepareObject( channel ) }

           valuesPattern =  method.values
           timingsPattern = method.timings
           valuesNode = args[ 0 ]
           timingsNode= args[ 1 ]

           valuesPattern.codemirror = timingsPattern.codemirror = codemirror 
          
           if( valuesNode ) {
             Marker._markPattern[ valuesNode.type ]( valuesNode, expressionNode, components, codemirror, channel, index, 'values', valuesPattern ) 
           }  
           if( timingsNode ) {
             Marker._markPattern[ timingsNode.type ]( timingsNode, expressionNode, components, codemirror, channel, index, 'timings', timingsPattern )  
           }

           break;

         case 'THIS.METHOD[ 0 ].SEQ': // will this ever happen??? I guess after it has been sequenced once?
           isTrack  = channelNames.includes( components[0] )
           target = null

           channel = window[ components[0] ][ components[1] ]
           
           //if( !isTrack ) { // not a channel! XXX please, please get a better parsing method / rules...
           //  target = channel
           //  channel = Gibber.currentTrack
           //}

           valuesPattern =  target === null ? channel[ components[2] ][ index ].values : target[ components[2] ].values
           timingsPattern = target === null ? channel[ components[2] ][ index ].timings : target[ components[2] ].timings //channel[ components[2] ][ index ].timings
           valuesNode = args[0]
           timingsNode = args[1]

           valuesPattern.codemirror = timingsPattern.codemirror = codemirror

           if( valuesNode ) { 
             Marker._markPattern[ valuesNode.type ]( valuesNode, expressionNode, components, codemirror, channel, index, 'values', valuesPattern ) 
           }
           if( timingsNode ) {
             Marker._markPattern[ timingsNode.type ]( timingsNode, expressionNode, components, codemirror, channel, index, 'timings', timingsPattern )  
           }

           break;

         case 'THIS.METHOD.VALUES.REVERSE.SEQ':
           usesThis = components.includes( 'this' )
           isTrack  = components.includes( 'channels' )

           if( isTrack ) { // XXX this won't ever get called here, right?
             channel = window[ components[0] ][ components[1] ] 
             targetPattern = channel[ components[2] ][ components[3] ]
             method = targetPattern[ components[4] ]

           }else{
             channel = usesThis ? Gibber.currentTrack : window[ components[0] ],
             targetPattern = channel[ components[1] ][ components[2] ],
             method = targetPattern[ components[3] ]
           }
        
            
           valuesPattern = method.values
           timingsPattern = method.timings
           valuesNode = args[0]
           timingsNode = args[1]

           valuesPattern.codemirror = timingsPattern.codemirror = codemirror
           
           if( valuesNode ) {
             Marker._markPattern[ valuesNode.type ]( valuesNode, expressionNode, components, codemirror, channel, index, 'values', valuesPattern ) 
           }  
           if( timingsNode ) {
             Marker._markPattern[ timingsNode.type ]( timingsNode, expressionNode, components, codemirror, channel, index, 'timings', timingsPattern )  
           }

           break;

         case 'THIS.METHOD[ 0 ].VALUES.REVERSE.SEQ': // most useful?
           usesThis = components.includes( 'this' )
           isTrack  = components.includes( 'channels' )
           // channels['1-Impulse 606'].devices['Impulse']['Global Time']
           
           if( isTrack ) {
             channel = window[ components[0] ][ components[1] ] 
             targetPattern = channel[ components[2] ][ components[3] ]
             method = targetPattern[ components[4] ]

           }else{
             channel = usesThis ? Gibber.currentTrack : window[ components[0] ],
             targetPattern = channel[ components[1] ][ index ][ components[3] ],
             method = targetPattern[ components[4] ]
           }

           valuesPattern =  method.values
           timingsPattern = method.timings
           valuesNode = args[ 0 ]
           timingsNode= args[ 1 ]
          
           valuesPattern.codemirror = timingsPattern.codemirror = codemirror

           if( !isTrack ) components.splice( 2,index )
          
           if( valuesNode ) {
             Marker._markPattern[ valuesNode.type ]( valuesNode, expressionNode, components, codemirror, channel, index, 'values', valuesPattern ) 
           }
           if( timingsNode ) {
             Marker._markPattern[ timingsNode.type ]( timingsNode, expressionNode, components, codemirror, channel, index, 'timings', timingsPattern )  
           }
           break;
         case 'CHANNELS[0].METHOD[ 0 ].VALUES.REVERSE.SEQ':
           channel = window[ 'channels' ][ components[ 1 ] ]

           components[3] = components[3]
           valuesPattern =  channel[ components[ 2 ] ][ components[3] ][ components[4] ][ components[5] ].values
           timingsPattern = channel[ components[ 2 ] ][ components[3] ][ components[4] ][ components[5] ].timings
           valuesNode = args[ 0 ]
           timingsNode= args[ 1 ]
          
           valuesPattern.codemirror = timingsPattern.codemirror = codemirror

           if( valuesNode ) {
             Marker._markPattern[ valuesNode.type ]( valuesNode, expressionNode, components, codemirror, channel, index, 'values', valuesPattern ) 
           }  
           if( timingsNode ) {
             Marker._markPattern[ timingsNode.type ]( timingsNode, expressionNode, components, codemirror, channel, index, 'timings', timingsPattern )  
           }
           break;

         default:
           console.log( 'default annotation error' )
           break;
      }
    },
  },

  _createBorderCycleFunction( classNamePrefix, patternObject ) {
    let modCount = 0,
        lastBorder = null,
        lastClassName = null
    
    let cycle = function() {
      let className = '.' + classNamePrefix + '_' +  patternObject.update.currentIndex,
          border = 'top'

      switch( modCount++ % 4 ) {
        case 1: border = 'right'; break;
        case 2: border = 'bottom'; break;
        case 3: border = 'left'; break;
      }


      $( className ).remove( 'annotation-' + border + '-border' )
      $( className ).add( 'annotation-' + border + '-border-cycle' )
      
      if( lastBorder !== null ) {
        $( className ).remove( 'annotation-' + lastBorder + '-border-cycle' )
        $( className ).add( 'annotation-' + lastBorder + '-border' )
      }
      
      lastBorder = border
      lastClassName = className

      //console.log( 'cycle idx:', patternObject.idx )
    }

    cycle.clear = function() {
      modCount = 1
      
      if( lastClassName !== null ) {
        $( lastClassName ).remove( 'annotation-left-border' )
        $( lastClassName ).remove( 'annotation-left-border-cycle' )
        $( lastClassName ).remove( 'annotation-right-border' )
        $( lastClassName ).remove( 'annotation-right-border-cycle' )
        $( lastClassName ).remove( 'annotation-top-border' )
        $( lastClassName ).remove( 'annotation-top-border-cycle' )
        $( lastClassName ).remove( 'annotation-bottom-border' )
        $( lastClassName ).remove( 'annotation-bottom-border-cycle' )
      }

      lastBorder = null
    }

    return cycle
  },

  _addPatternUpdates( patternObject, className ) {
    let cycle = Marker._createBorderCycleFunction( className, patternObject )
    
    patternObject.update = () => {
      // if( !patternObject.update.shouldUpdate ) return 
      cycle() 
    }
  },

  _addPatternFilter( patternObject ) {
    patternObject.filters.push( ( args ) => {
      const wait = Utility.beatsToMs( patternObject.nextTime,  Gibber.Scheduler.bpm )

      let idx = args[ 2 ],
          shouldUpdate = patternObject.update.shouldUpdate
        
      Gibber.Environment.animationScheduler.add( () => {
        patternObject.update.currentIndex = idx
        patternObject.update()
      }, wait ) 

      return args
    }) 
  },

  _markPattern: {
    Literal( patternNode, containerNode, components, cm, channel, index=0, patternType, patternObject ) {
      let [ className, start, end ] = Marker._getNamesAndPosition( patternNode, containerNode, components, index, patternType ),
          cssName = className + '_0',
          marker = cm.markText( start, end, { 
            'className': cssName + ' annotation annotation-full', 
            inclusiveLeft: true,
            inclusiveRight: true
          })

        channel.markup.textMarkers[ className ] = marker

        if( channel.markup.cssClasses[ className ] === undefined ) channel.markup.cssClasses[ className ] = []

        channel.markup.cssClasses[ className ][ index ] = cssName    

        Marker._addPatternUpdates( patternObject, className )
        Marker._addPatternFilter( patternObject )

        patternObject.patternName = className
        patternObject._onchange = () => { Marker._updatePatternContents( patternObject, className, channel ) }
    },

    UnaryExpression( patternNode, containerNode, components, cm, channel, index=0, patternType, patternObject ) { // -1 etc.
      let [ className, start, end ] = Marker._getNamesAndPosition( patternNode, containerNode, components, index, patternType ),
          cssName = className + '_0',
          marker = cm.markText( start, end, { 
            'className': cssName + ' annotation', 
            inclusiveLeft: true,
            inclusiveRight: true
          })

        channel.markup.textMarkers[ className ] = marker

        if( channel.markup.cssClasses[ className ] === undefined ) channel.markup.cssClasses[ className ] = []

        channel.markup.cssClasses[ className ][ index ] = cssName    

        let start2 = Object.assign( {}, start )
        start2.ch += 1
        let marker2 = cm.markText( start, start2, { 
          'className': cssName + ' annotation-no-right-border', 
          inclusiveLeft: true,
          inclusiveRight: true
        })

        let marker3 = cm.markText( start2, end, { 
          'className': cssName + ' annotation-no-left-border', 
          inclusiveLeft: true,
          inclusiveRight: true
        })

        Marker._addPatternUpdates( patternObject, className )
        Marker._addPatternFilter( patternObject )

        patternObject.patternName = className
        patternObject._onchange = () => { Marker._updatePatternContents( patternObject, className, channel ) }
    },

    BinaryExpression( patternNode, containerNode, components, cm, channel, index=0, patternType, patternObject ) { // 1/4 etc. 
      let [ className, start, end ] = Marker._getNamesAndPosition( patternNode, containerNode, components, index, patternType ),
         cssName = className + '_0',
         marker = cm.markText(
           start, 
           end,
           { 
             'className': cssName + ' annotation annotation-border' ,
             startStyle: 'annotation-no-right-border',
             endStyle: 'annotation-no-left-border',
             inclusiveLeft:true,
             inclusiveRight:true
           }
         ) 

      const divStart = Object.assign( {}, start )
      const divEnd   = Object.assign( {}, end )

      divStart.ch += 1
      divEnd.ch -= 1

      const marker2 = cm.markText( divStart, divEnd, { className:'annotation-binop-border' })

      channel.markup.textMarkers[ className ] = marker

      if( channel.markup.cssClasses[ className ] === undefined ) channel.markup.cssClasses[ className ] = []
      channel.markup.cssClasses[ className ][ index ] = cssName

      patternObject.patternName = className

      Marker._addPatternUpdates( patternObject, className )
      Marker._addPatternFilter( patternObject )
    },

    ArrayExpression( patternNode, containerNode, components, cm, channel, index=0, patternType, patternObject ) {
      let [ patternName, start, end ] = Marker._getNamesAndPosition( 
        patternNode, 
        containerNode, 
        components, 
        index, 
        patternType 
      )
      
      let count = 0

      for( let element of patternNode.elements ) {
        let cssClassName = patternName + '_' + count,
            elementStart = Object.assign( {}, start ),
            elementEnd   = Object.assign( {}, end   ),
            marker
        
        elementStart.ch = element.start + containerNode.horizontalOffset
        elementEnd.ch   = element.end   + containerNode.horizontalOffset

        if( element.type === 'BinaryExpression' ) {
          marker = cm.markText( elementStart, elementEnd, { 
            'className': cssClassName + ' annotation',
             startStyle: 'annotation-no-right-border',
             endStyle: 'annotation-no-left-border',
             inclusiveLeft:true, inclusiveRight:true
          })

          // create specific border for operator: top, bottom, no sides
          const divStart = Object.assign( {}, elementStart )
          const divEnd   = Object.assign( {}, elementEnd )

          divStart.ch += 1
          divEnd.ch -= 1

          const marker2 = cm.markText( divStart, divEnd, { className:cssClassName + '_binop annotation-binop' })


        }else if (element.type === 'UnaryExpression' ) {
          marker = cm.markText( elementStart, elementEnd, { 
            'className': cssClassName + ' annotation', 
            inclusiveLeft: true,
            inclusiveRight: true
          })

          let start2 = Object.assign( {}, elementStart )
          start2.ch += 1
          let marker2 = cm.markText( elementStart, start2, { 
            'className': cssClassName + ' annotation-no-right-border', 
            inclusiveLeft: true,
            inclusiveRight: true
          })

          let marker3 = cm.markText( start2, elementEnd, { 
            'className': cssClassName + ' annotation-no-left-border', 
            inclusiveLeft: true,
            inclusiveRight: true
          })
        }else if( element.type === 'ArrayExpression' ) {
           marker = cm.markText( elementStart, elementEnd, { 
            'className': cssClassName + ' annotation',
            inclusiveLeft:true, inclusiveRight:true,
            startStyle:'annotation-left-border-start',
            endStyle: 'annotation-right-border-end',
           })

           // mark opening array bracket
           const arrayStart_start = Object.assign( {}, elementStart )
           const arrayStart_end  = Object.assign( {}, elementStart )
           arrayStart_end.ch += 1
           cm.markText( arrayStart_start, arrayStart_end, { className:cssClassName + '_start' })

           // mark closing array bracket
           const arrayEnd_start = Object.assign( {}, elementEnd )
           const arrayEnd_end   = Object.assign( {}, elementEnd )
           arrayEnd_start.ch -=1
           cm.markText( arrayEnd_start, arrayEnd_end, { className:cssClassName + '_end' })

        }else{
          marker = cm.markText( elementStart, elementEnd, { 
            'className': cssClassName + ' annotation',
            inclusiveLeft:true, inclusiveRight:true
          })
        }

        if( channel.markup.textMarkers[ patternName  ] === undefined ) channel.markup.textMarkers[ patternName ] = []
        channel.markup.textMarkers[ patternName ][ count ] = marker
       
        if( channel.markup.cssClasses[ patternName ] === undefined ) channel.markup.cssClasses[ patternName ] = []
        channel.markup.cssClasses[ patternName ][ count ] = cssClassName 
        
        count++
      }
      
      let highlighted = { className:null, isArray:false },
          cycle = Marker._createBorderCycleFunction( patternName, patternObject )
      
      patternObject.patternType = patternType 
      patternObject.patternName = patternName

      patternObject.update = () => {
        let className = '.' + patternName
        
        className += '_' + patternObject.update.currentIndex 

        if( highlighted.className !== className ) {

          // remove any previous annotations for this pattern
          if( highlighted.className !== null ) {
            if( highlighted.isArray === false && highlighted.className ) { 
              $( highlighted.className ).remove( 'annotation-border' ) 
            }else{
              $( highlighted.className ).remove( 'annotation-array' )
              $( highlighted.className + '_start' ).remove( 'annotation-border-left' )
              $( highlighted.className + '_end' ).remove( 'annotation-border-right' )

              if( $( highlighted.className + '_binop' ).length > 0 ) {
                $( highlighted.className + '_binop' ).remove( 'annotation-binop-border' )
              }

            }
          }

          // add annotation for current pattern element
          if( Array.isArray( patternObject.values[ patternObject.update.currentIndex ] ) ) {
            $( className ).add( 'annotation-array' )
            $( className + '_start' ).add( 'annotation-border-left' )
            $( className + '_end' ).add( 'annotation-border-right' )
            highlighted.isArray = true
          }else{
            $( className ).add( 'annotation-border' )

            if( $( className + '_binop' ).length > 0 ) {
              $( className + '_binop' ).add( 'annotation-binop-border' )
            }
            highlighted.isArray = false
          }

          highlighted.className = className

          cycle.clear()
        }else{
          cycle()
        }
      }

      patternObject.clear = () => {
        if( highlighted.className !== null ) { $( highlighted.className ).remove( 'annotation-border' ) }
        cycle.clear()
      }

      Marker._addPatternFilter( patternObject )
      patternObject._onchange = () => { Marker._updatePatternContents( patternObject, patternName, channel ) }
    },

    // CallExpression denotes an array (or other object) that calls a method, like .rnd()
    // could also represent an anonymous function call, like Rndi(19,40)
    CallExpression( patternNode, containerNode, components, cm, channel, index=0, patternType, patternObject ) {
      var args = Array.prototype.slice.call( arguments, 0 )
      // console.log( patternNode.callee.type, patternObject )

      if( patternNode.callee.type === 'MemberExpression' && patternNode.callee.object.type === 'ArrayExpression' ) {
        args[ 0 ] = patternNode.callee.object

        Marker._markPattern.ArrayExpression.apply( null, args )
      } else if (patternNode.callee.type === 'Identifier' ) {
        // function like Euclid
        Marker._markPattern.Identifier.apply( null, args )
      }
    },

    Identifier( patternNode, containerNode, components, cm, channel, index=0, patternType, patternObject ) {
      // mark up anonymous functions with comments here... 
      let [ className, start, end ] = Marker._getNamesAndPosition( patternNode, containerNode, components, index, patternType ),
          commentStart = end,
          commentEnd = {},
          marker = null
      
      Object.assign( commentEnd, commentStart )
      
      commentEnd.ch += 1

      marker = cm.markText( commentStart, commentEnd, { className })
       
      //  if( channel.markup.textMarkers[ className  ] === undefined ) channel.markup.textMarkers[ className ] = []
      //  channel.markup.textMarkers[ className ][ 0 ] = marker
      //  console.log( 'name', patternNode.callee.name )
      let updateName = typeof patternNode.callee !== 'undefined' ? patternNode.callee.name : patternNode.name 
      if( patternObject.type !== undefined ) updateName = patternObject.type 

      if( Marker.patternUpdates[ updateName ] ) {
        patternObject.update = Marker.patternUpdates[ updateName ]( patternObject, marker, className, cm, channel )
      } else {
        patternObject.update = Marker.patternUpdates.anonymousFunction( patternObject, marker, className, cm, channel )
      }
      
      patternObject.patternName = className
      // store value changes in array and then pop them every time the annotation is updated
      patternObject.update.value = []

      Marker._addPatternFilter( patternObject )
    }, 
  },

  patternUpdates: {
    Euclid: ( patternObject, marker, className, cm, channel ) => {
      let val ='/* ' + patternObject.values.join('')  + ' */',
          pos = marker.find(),
          end = Object.assign( {}, pos.to ),
          annotationStartCh = pos.from.ch + 3,
          annotationEndCh   = annotationStartCh + 1,
          memberAnnotationStart   = Object.assign( {}, pos.from ),
          memberAnnotationEnd     = Object.assign( {}, pos.to ),
          commentMarker,
          currentMarker, chEnd

      end.ch = pos.from.ch + val.length

      pos.to.ch -= 1
      cm.replaceRange( val, pos.from, pos.to )

      patternObject.commentMarker = cm.markText( pos.from, end, { className, atomic:true }) //replacedWith:element })

      channel.markup.textMarkers[ className ] = {}
      
      let mark = () => {
        memberAnnotationStart.ch = annotationStartCh
        memberAnnotationEnd.ch   = annotationEndCh

        for( let i = 0; i < patternObject.values.length; i++ ) {
          channel.markup.textMarkers[ className ][ i ] = cm.markText(
            memberAnnotationStart,  memberAnnotationEnd,
            { 'className': `${className}_${i}` }
          )

          memberAnnotationStart.ch += 1
          memberAnnotationEnd.ch   += 1
        }

      }
      
      mark()

      // XXX: there's a bug when you sequence pattern transformations, and then insert newlines ABOVE the annotation
      let count = 0, span, update, activeSpans = []

      update = () => {
        let currentIdx = count++ % patternObject.values.length
        
        if( span !== undefined ) {
          span.remove( 'euclid0' )
        }

        let spanName = `.${className}_${currentIdx}`,
            currentValue = patternObject.values[ currentIdx ]
 
        span = $( spanName )

        if( currentValue === 1 ) {
          span.add( 'euclid1' )
          activeSpans.push( span )
          setTimeout( ()=> { 
            activeSpans.forEach( _span => _span.remove( 'euclid1' ) )
            activeSpans.length = 0 
          }, 50 )
        }
        
        span.add( 'euclid0' )
      }

      patternObject._onchange = () => {
        let delay = Utility.beatsToMs( 1,  Gibber.Scheduler.bpm )
        Gibber.Environment.animationScheduler.add( () => {
          for( let i = 0; i < patternObject.values.length; i++ ) {
   
            let markerCh = channel.markup.textMarkers[ className ][ i ],
                pos = markerCh.find()
            
            marker.doc.replaceRange( '' + patternObject.values[ i ], pos.from, pos.to )
          }
          mark()
        }, delay ) 
      }

      patternObject.clear = () => {
        try{
          let commentPos = patternObject.commentMarker.find()
          cm.replaceRange( '', commentPos.from, commentPos.to )
          patternObject.commentMarker.clear()
        } catch( e ) {
          console.log( 'euclid annotation error:', e )
        } // yes, I just did that XXX 
      }

      return update 
    },
    anonymousFunction: ( patternObject, marker, className, cm ) => {
      patternObject.commentMarker = marker
      let update = () => {
        if( !patternObject.commentMarker ) return
        let patternValue = '' + patternObject.update.value.pop()
        
        if( patternValue.length > 8 ) patternValue = patternValue.slice(0,8) 

        let val ='/* ' + patternValue + ' */,',
            pos = patternObject.commentMarker.find(),
            end = Object.assign( {}, pos.to )
         
        //pos.from.ch += 1
        end.ch = pos.from.ch + val.length 
        //pos.from.ch += 1

        cm.replaceRange( val, pos.from, pos.to )
        

        if( patternObject.commentMarker ) patternObject.commentMarker.clear()

        patternObject.commentMarker = cm.markText( pos.from, end, { className, atomic:true })
      }

      patternObject.clear = () => {
        try{
          let commentPos = patternObject.commentMarker.find()
          commentPos.to.ch -= 1 // XXX wish I didn't have to do this
          cm.replaceRange( '', commentPos.from, commentPos.to )
          patternObject.commentMarker.clear()
          delete patternObject.commentMarker
        } catch( e ) {} // yes, I just did that XXX 
      }
      return update
    }
  },

  functions:{
    Score( node, cm, channel, objectName, vOffset=0 ) {
      let timelineNodes = node.arguments[ 0 ].elements
      const score = window[ objectName ]

      score.markup.textMarkers[ 'score' ] = []

      for( let i = 0; i < timelineNodes.length; i+=2 ) {
        let timeNode = timelineNodes[ i ],
            functionNode = timelineNodes[ i + 1 ]
            
        if( functionNode !== null ) { // check for Score.wait and null
          functionNode.loc.start.line += vOffset - 1
          functionNode.loc.end.line   += vOffset - 1
          functionNode.loc.start.ch = functionNode.loc.start.column
          functionNode.loc.end.ch = functionNode.loc.end.column

          let marker = cm.markText( functionNode.loc.start, functionNode.loc.end, { className:`score${i/2}` } )
          score.markup.textMarkers[ 'score' ][ i/2 ] = marker
        }

      }

      let lastClass = 'score0'
      $( '.' + lastClass ).add( 'scoreCurrentIndex' )

      score.onadvance = ( idx ) => {
        $( '.' + lastClass ).remove( 'scoreCurrentIndex' )
        lastClass = `score${idx}`
        $( '.' + lastClass ).add( 'scoreCurrentIndex' ) 
      }
    },

    Steps( node, cm, channel, objectName, vOffset=0 ) {
      let steps = node.arguments[ 0 ].properties

      channel.markup.textMarkers[ 'step' ] = []
      channel.markup.textMarkers[ 'step' ].children = []

      let mark = ( _step, _key, _cm, _channel ) => {
        for( let i = 0; i < _step.value.length; i++ ) {
          let pos = { loc:{ start:{}, end:{}} }
          Object.assign( pos.loc.start, _step.loc.start )
          Object.assign( pos.loc.end  , _step.loc.end   )
          pos.loc.start.ch += i
          pos.loc.end.ch = pos.loc.start.ch + 1
          let posMark = _cm.markText( pos.loc.start, pos.loc.end, { className:`step_${_key}_${i}` })
          _channel.markup.textMarkers.step[ _key ].pattern[ i ] = posMark
        }
      }

      for( let key in steps ) {
        let step = steps[ key ].value

        if( step && step.value ) { // ensure it is a correctly formed step
          step.loc.start.line += vOffset - 1
          step.loc.end.line   += vOffset - 1
          step.loc.start.ch   = step.loc.start.column + 1
          step.loc.end.ch     = step.loc.end.column - 1
          
          let marker = cm.markText( step.loc.start, step.loc.end, { className:`step${key}` } )
          channel.markup.textMarkers.step[ key ] = marker

          channel.markup.textMarkers.step[ key ].pattern = []
          
          mark( step, key, cm, channel )

          let count = 0, span, update,
              _key = steps[ key ].key.value,
              patternObject = window[ objectName ].seqs[ _key ].values

          update = () => {
            let currentIdx = update.currentIndex // count++ % step.value.length
            
            if( span !== undefined ) {
              span.remove( 'euclid0' )
            }
            
            let spanName = `.step_${key}_${currentIdx}`,
                currentValue = patternObject.update.value.pop() //step.value[ currentIdx ]
            
            span = $( spanName )

            if( currentValue !== Gibber.Seq.DO_NOT_OUTPUT ) {
              span.add( 'euclid1' )
              setTimeout( ()=> { span.remove( 'euclid1' ) }, 50 )
            }
            
            span.add( 'euclid0' )
          }

          patternObject._onchange = () => {
            // delay not needed for MIDI version
            // let delay = Utility.beatsToMs( 1,  Gibber.Scheduler.bpm )
            Gibber.Environment.animationScheduler.add( () => {
              marker.doc.replaceRange( patternObject.values.join(''), step.loc.start, step.loc.end )
              mark( step, key, cm, channel )
            }, 0 ) 
          }

          patternObject.update = update
          patternObject.update.value = []

          Marker._addPatternFilter( patternObject )
        }
      }

    },  
  },


  _updatePatternContents( pattern, patternClassName, channel ) {
    let marker, pos, newMarker

    if( pattern.values.length > 1 ) {
      // array of values
      for( let i = 0; i < pattern.values.length; i++) {
        marker = channel.markup.textMarkers[ patternClassName ][ i ]
        pos = marker.find()

        marker.doc.replaceRange( '' + pattern.values[ i ], pos.from, pos.to )
      }
    }else{
      // single literal
      marker = channel.markup.textMarkers[ patternClassName ]
      pos = marker.find()

      marker.doc.replaceRange( '' + pattern.values[ 0 ], pos.from, pos.to )
      // newMarker = marker.doc.markText( pos.from, pos.to, { className: patternClassName + ' annotation-border' } )
      // channel.markup.textMarkers[ patternClassName ] = newMarker
    }
  },

  _getNamesAndPosition( patternNode, containerNode, components, index=0, patternType ) {
    let start   = patternNode.loc.start,
        end     = patternNode.loc.end,
        className = components.slice( 0 ),
        cssName   = null,
        marker

     if( className.includes( 'this' ) ) className.shift()

     if( className.includes( 'channels' ) ) {
       //className = [ 'channels', components[1] ].concat( components.slice( 2, components.length - 1 ) )
       if( index !== 0 ) {
         className.splice( 3, 0, index )
       }
     }else{
       if( index !== 0 ) {
         className.splice( 1, 0, index ) // insert index into array
       }
     }

     className.push( patternType )
     className = className.join( '_' )

     let expr = /\[\]/gi
     className = className.replace( expr, '' )

     expr = /\-/gi
     className = className.replace( expr, '_' )

     expr = /\ /gi
     className = className.replace( expr, '_' )

     start.line += containerNode.verticalOffset - 1
     end.line   += containerNode.verticalOffset - 1
     start.ch   = start.column + containerNode.horizontalOffset
     end.ch     = end.column + containerNode.horizontalOffset

     return [ className, start, end ]
  },

  _getCallExpressionHierarchy( expr ) {
    let callee = expr.callee,
        obj = callee.object,
        components = [],
        index = 0,
        depth = 0

    while( obj !== undefined ) {
      let pushValue = null

      if( obj.type === 'ThisExpression' ) {
        pushValue = 'this' 
      }else if( obj.property && obj.property.name ){
        pushValue = obj.property.name
      }else if( obj.property && obj.property.type === 'Literal' ){ // array index
        pushValue = obj.property.value

        // don't fall for channels[0] etc.
        // if( depth > 1 ) index = obj.property.value
      }else if( obj.type === 'Identifier' ) {
        pushValue = obj.name
      }
      
      if( pushValue !== null ) components.push( pushValue ) 

      depth++
      obj = obj.object
    }
    
    components.reverse()
    
    if( callee.property )
      components.push( callee.property.name )

    return [ components, depth, index ]
  },

}

module.exports = Marker
