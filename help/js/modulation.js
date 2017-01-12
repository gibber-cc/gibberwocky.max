const genish = require( 'genish.js' )

module.exports = function( Gibber ) {


let Gen  = {
  sr: 60,
  __solo: null,

  init() {
    Gen.genish.gen.samplerate = Gen.sr

    const update = ()=> {
      Gen.runWidgets()
      Gibber.Environment.animationScheduler.add( update, 1000/Gen.genish.gen.samplerate )
    }

    Gibber.Environment.animationScheduler.add( update )

    //Gibber.Environment.codeMarkup.updateWidget( 1, Gibber.Environment.codeMarkup.genWidgets[1].gen() )
  },

  solo( channel=0, ccnum=0 ) {
    if( Gen.__solo === null ) {
      Gen.__solo = { channel, ccnum }
    }else{
      Gen.__solo = null
    }
  },

  runWidgets: function () {
    for( let id in Gibber.Environment.codeMarkup.genWidgets ) {
      if( id === 'dirty' ) continue
      const widget = Gibber.Environment.codeMarkup.genWidgets[ id ]
      let value = widget.gen() 
      Gibber.Environment.codeMarkup.updateWidget( id, value )
      if( Gen.__solo === null || ( Gen.__solo.channel === widget.gen.channel && Gen.__solo.ccnum === widget.gen.ccnum) ) {
        Gibber.MIDI.send([ 0xb0 + widget.gen.channel, widget.gen.ccnum, Math.floor( value * 128 ) ]) 
      }
    }
  },

  genish,

  names:[],
  connected: [],

  // if property is !== ugen (it's a number) a Param must be made using a default
  create( name ) {
    let obj = Object.create( this ),
        count = 0,
        params = Array.prototype.slice.call( arguments, 1 )
    
    obj.name = name
    obj.active = false
    
    for( let key of Gen.functions[ name ].properties ) { 

      let value = params[ count++ ]
      obj[ key ] = ( v ) => {
        if( v === undefined ) {
          return value
        }else{
          value = v
          if( obj.active ) {
            //onsole.log( `${obj.track} genp ${obj.paramID} ${obj[ key ].uid} ${v}` )
            Gibber.Communication.send( `genp ${obj.paramID} ${obj[ key ].uid} ${v}` ) 
          }
        }
      }
      obj[ key ].uid = Gen.getUID()

      Gibber.addSequencingToMethod( obj, key )
    }

    return obj
  },
  

  assignTrackAndParamID: function( graph, channel, ccnum ) {
    graph.ccnum = ccnum
    graph.channel = channel

    let count = 0, param
    while( param = graph[ count++ ] ) {
      if( typeof param() === 'object' ) {
        Gen.assignTrackAndParamID( param(), channel, ccnum )
      }
    }
  },

  clear() {
    for( let ugen of Gen.connected ) {
      Gibber.Communication.send( `ungen ${ugen.paramID}` )
    }

    Gen.connected.length = 0
  },

  _count: 0,

  getUID() {
    return 'p' + Gen._count++
  },

  time: 'time',

  composites: { 
    lfo( frequency = .1, amp = .5, center = .5 ) {
      let _cycle = cycle( frequency ),
          _mul   = mul( _cycle, amp ),
          _add   = add( center, _mul ) 
       
      _add.frequency = (v) => {
        if( v === undefined ) {
          return _cycle[ 0 ]()
        }else{
          _cycle[0]( v )
        }
      }

      _add.amp = (v) => {
        if( v === undefined ) {
          return _mul[ 1 ]()
        }else{
          _mul[1]( v )
        }
      }

      _add.center = (v) => {
        if( v === undefined ) {
          return _add[ 0 ]()
        }else{
          _add[0]( v )
        }
      }

      Gibber.addSequencingToMethod( _add, 'frequency' )
      Gibber.addSequencingToMethod( _add, 'amp' )
      Gibber.addSequencingToMethod( _add, 'center' )

      return _add
    },

    fade( time = 1, from = 1, to = 0 ) {
      let fade, amt, beatsInSeconds = time * ( 60 / Gibber.Live.LOM.bpm )
     
      if( from > to ) {
        amt = from - to

        fade = gtp( sub( from, accum( div( amt, mul(beatsInSeconds, samplerate ) ), 0 ) ), to )
      }else{
        amt = to - from
        fade = add( from, ltp( accum( div( amt, mul( beatsInSeconds, samplerate ) ), 0 ), to ) )
      }
      
      // XXX should this be available in ms? msToBeats()?
      let numbeats = time / 4
      fade.shouldKill = {
        after: numbeats, 
        final: to
      }
      
      return fade
    },
    
    beats( num ) {
      return rate( 'in1', num )
      // beat( n ) => rate(in1, n)
      // final string should be rate( in1, num )
    }
  },

  export( obj ) {
    genish.export( obj )
  }
}

Gen.init()

return Gen 

}


/*

a = LFO( .5, .25, .5 )
// lfo has frequency, amplitude and bias

->

// every array indicates presence of new ugen
a.graph = [ 'add', 'bias', [ 'mul', 'amp', [ 'cycle', 'frequency' ] ] ]
*/
