'use strict';

module.exports = function( Gibber ) {
  let Max = {
    signals:[],
    params:[],

    init() {
      Gibber.Communication.callbacks.scene = Max.handleScene
      Gibber.Communication.send( 'get_scene' )     
    },

    handleScene( msg ) {
      Max.id = Communication.querystring.track

      Max.MOM = msg

      Max.processMOM()
    },

    clear() {
      for( let i = 0; i < Max.signals.length; i++ ) {
        Gibber.Communication.send( `sig ${i} clear` )
      }
    },

    processMOM() {
      for( let signalNumber of Max.MOM.signals ) {
        Max.signals[ signalNumber ] = function( genGraph ) {
          genGraph.id = signalNumber
          if( Gibber.Gen.connected.find( e => e.id === signalNumber ) === undefined ) {
            Gibber.Gen.connected.push( genGraph )
          }

          Gibber.Gen.lastConnected = genGraph
          Gibber.Communication.send( `sig ${signalNumber} expr "${genGraph.out()}"` )
        }
        Max.signals[ signalNumber ].id = signalNumber
      }

      for( let param of Max.MOM.root.params ) {
        Max.params[ param.varname ] = function( v ) {
          Gibber.Communication.send( `set ${param.path} ${v}` )
        }
        Gibber.addSequencingToMethod( Max.params, param.varname, 0 )
      }
    },

    msg( str ) {
      let msg = {
        address:str
      }

      let proxy = new Proxy( msg, {
        get( target, prop, receiver ) {
          if( target[ prop ] === undefined && prop !== 'markup' ) {
            Max.createProperty( target, prop )
          }

          return target[ prop ]
        }
      })

      return proxy
    },

    createProperty( target, prop ) {
      Gibber.addMethod( target, prop )
    }
  }

  return Max
}
