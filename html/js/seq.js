'use strict';

const Big = require( 'big.js' )

let seqclosure = function( Gibber ) {
  
  let Theory = Gibber.Theory

  let proto = {
    DO_NOT_OUTPUT: -987654321,
    _seqs: [],

    __clearAll__() {

      for( let seq of proto._seqs ) {
        seq.clear()

        for( let key in seq.object.markup.textMarkers ) {
          let marker = seq.object.markup.textMarkers[ key ]

          if( marker.clear ) marker.clear() 
        }
      }
      
      proto._seqs.length = 0

    },

    create( values, timings, key, object = null, priority=0 ) {
      let seq = Object.create( this )

      Object.assign( seq, {
        phase:   0,
        running: false,
        offset: 0,
        values,
        timings,
        object,
        key,
        priority,
        trackID:-1
      })
      
      seq.init()

      proto._seqs.push( seq )
      
      return seq
    },
    
    init() {
      let valuesPattern, timingsPattern

      if( ! Gibber.Pattern.prototype.isPrototypeOf( this.values ) ) {
        if( !Array.isArray( this.values ) ) this.values  = [ this.values ] 
        valuesPattern = Gibber.Pattern.apply( null, this.values ) 

        if( this.values.randomFlag ) {
          valuesPattern.filters.push( () => {
            var idx = Gibber.Utility.rndi( 0, valuesPattern.values.length - 1 )
            return [ valuesPattern.values[ idx ], 1, idx ] 
          })
          for( var i = 0; i < this.values.randomArgs.length; i+=2 ) {
            valuesPattern.repeat( this.values.randomArgs[ i ], this.values.randomArgs[ i + 1 ] )
          }
        }

        this.values = valuesPattern
      }

      if( this.key === 'note' ) {
        this.values.filters.push( args => {
          args[ 0 ] = Theory.Note.convertToMIDI( args[ 0 ] )
          return args
        })
      } else if( this.key === 'chord' ) {

        this.values.filters.push( args => {
          let chord = args[ 0 ], out

          if( typeof chord === 'string' ) {
            let chordObj = Gibber.Theory.Chord.create( chord )

            out = chordObj.notes 
          }else{
            if( typeof chord === 'function' ) chord = chord()
            out = chord.map( Gibber.Theory.Note.convertToMIDI )
          }

          args[0] = out
          
          return args
        })
      }

      if( ! Gibber.Pattern.prototype.isPrototypeOf( this.timings ) ) {
        if( this.timings !== undefined && !Array.isArray( this.timings ) ) this.timings = [ this.timings ]
        timingsPattern = Gibber.Pattern.apply( null, this.timings )
        timingsPattern.values.initial = this.timings.initial

        if( this.timings !== undefined ) {
          if( this.timings.randomFlag ) {
            timingsPattern.filters.push( ()=> { 
              var idx = Gibber.Utility.rndi( 0, timingsPattern.values.length - 1)
              return [ timingsPattern.values[ idx ], 1, idx ] 
            })
            for( var i = 0; i < this.timings.randomArgs.length; i+=2 ) {
              timingsPattern.repeat( this.timings.randomArgs[ i ], this.timings.randomArgs[ i + 1 ] )
            }
          }
        }

        this.timings = timingsPattern
      } 

      this.values.nextTime = this.timings.nextTime = 0
    },

    externalMessages: {
    },

    start() {
      if( this.running ) return
      this.running = true
      //console.log( 'starting with offset', this.offset ) 
      Gibber.Scheduler.addMessage( this, Big( this.offset ) )     
      
      return this
    },

    stop() {
      this.running = false
    },

    clear() {
      this.stop()
      if( typeof this.timings.clear === 'function' ) this.timings.clear()
      if( typeof this.values.clear  === 'function' ) this.values.clear()
    },
    
    delay( v ) { 
      this.offset = v
      return this
    },

    tick( scheduler, beat, beatOffset ) {
      if( !this.running ) return
      let _beatOffset = parseFloat( beatOffset.toFixed( 6 ) )

      this.timings.nextTime = _beatOffset
      // pick a new timing and schedule tick
      let nextTime = this.timings(),
          shouldExecute
      
      if( typeof nextTime === 'function' )  nextTime = nextTime()

      if( typeof nextTime === 'object' ) {
        shouldExecute = nextTime.shouldExecute
        nextTime = nextTime.time
      }else{
        shouldExecute = true
      }

      let bigTime = Big( nextTime )

      scheduler.addMessage( this, bigTime, true, this.priority )

      //console.log( 'beat:', beat, 'beatOffset:', beatOffset.toFixed() )

      if( shouldExecute ) {
        this.values.nextTime = _beatOffset
        this.values.beat = beat
        this.values.beatOffset = _beatOffset
        this.values.scheduler = scheduler

        let value = this.values()
        if( typeof value === 'function' ) value = value()
        if( value !== null ) {
          //console.log( 'key:', this.key, 'messages:', this.externalMessages )
          if( this.externalMessages[ this.key ] === undefined ) {

            if( this.object !== undefined && this.key !== undefined ) {
              if( typeof this.object[ this.key ] === 'function' ) {
                this.object[ this.key ]( value, Gibber.Utility.beatsToMs( _beatOffset ), true )
              }else{
                this.object[ this.key ] = value
              }
            }

          } else { // schedule internal method / function call immediately
            const msg = this.externalMessages[ this.key ]( value, beat + _beatOffset )//Gibber.Utility.beatsToMs( _beatOffset ) )
            if( Array.isArray(msg) ){
              msg.forEach( v => Gibber.Communication.send( v ) )
            }else{
              Gibber.Communication.send( msg )
            }
          }
        }
      } 

      //console.log( 'beat', beat )
      this.timings.nextTime = _beatOffset // for scheduling pattern updates
    },
    
  }

  proto.create = proto.create.bind( proto )
  proto.create.DO_NOT_OUTPUT = proto.DO_NOT_OUTPUT
  proto.create._seqs = proto._seqs
  proto.create.proto = proto

  return proto.create

}

module.exports = seqclosure
