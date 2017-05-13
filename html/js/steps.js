module.exports = function( Gibber ) {
  
let Steps = {
  type:'Steps',
  externalMessages: {
    note( number, beat, trackID ) {
      let msgstring = "add " + beat + " " + t + " " + n + " " + v + " " + d

      return `${trackID} add ${beat} note ${number}` 
    },
    midinote( number, beat, object, seq ) {
      let msg = `add ${beat} midinote ${object.path} ${number} ${object.__velocity} ${object.__duration}` 
      return msg 
    },
    duration( value, beat, trackID ) {
      return `${trackID} add ${beat} duration ${value}` 
    },

    velocity( value, beat, trackID ) {
      return `${trackID} add ${beat} velocity ${value}` 
    },

    chord( chord, beat, trackID ) {
      //console.log( chord )
      let msg = []

      for( let i = 0; i < chord.length; i++ ) {
        msg.push( `${trackID} add ${beat} note ${chord[i]}` )
      }

      return msg
    },
    cc( number, value, beat ) {
      return `${trackID} add ${beat} cc ${number} ${value}`
    },
  },
  create( _steps, track = Gibber.currentTrack ) {
    let stepseq = Object.create( Steps )
    
    stepseq.seqs = {}

    //  create( values, timings, key, object = null, priority=0 )
    for ( let _key in _steps ) {
      let values = _steps[ _key ].split(''),
          key = parseInt( _key )

      let seq = Gibber.Seq( values, 1 / values.length, 'midinote', track, 0 )
      seq.externalMessages = Steps.externalMessages

      seq.trackID = track.id

      seq.values.filters.push( function( args ) {
        let sym = args[ 0 ],
            velocity = ( parseInt( sym, 16 ) * 8 ) - 1

        if( isNaN( velocity ) ) {
          velocity = 0
        }

        // TODO: is there a better way to get access to beat, beatOffset and scheduler?
        if( velocity !== 0 ) {
          //let msg = seq.externalMessages[ 'velocity' ]( velocity, seq.values.beat + seq.values.beatOffset, seq.trackID )
          //track.velocity( velocity )
          track.__velocity = velocity
          //seq.values.scheduler.msgs.push( msg ) 
        }

        args[ 0 ] = sym === '.' ? Gibber.Seq.DO_NOT_OUTPUT : key

        return args
      })

      stepseq.seqs[ _key ] = seq
      stepseq[ _key ] = seq.values
    }

    stepseq.start()
    stepseq.addPatternMethods()

    return stepseq
  },
  
  addPatternMethods() {
    groupMethodNames.map( name => {
      this[ name ] = function( ...args ) {
        for( let key in this.seqs ) {
          this.seqs[ key ].values[ name ].apply( this, args )
        }
      }
    
      Gibber.addSequencingToMethod( this, name, 1 )
    })
  },

  start() {
    for( let key in this.seqs ) { 
      this.seqs[ key ].start()
    }
  },

  stop() {
    for( let key in this.seqs ) { 
      this.seqs[ key ].stop()
    }
  },

  clear() { this.stop() },

  /*
   *rotate( amt ) {
   *  for( let key in this.seqs ) { 
   *    this.seqs[ key ].values.rotate( amt )
   *  }
   *},
   */
}

const groupMethodNames = [ 
  'rotate', 'reverse', 'transpose', 'range',
  'shuffle', 'scale', 'repeat', 'switch', 'store', 
  'reset','flip', 'invert', 'set'
]

return Steps.create

}
