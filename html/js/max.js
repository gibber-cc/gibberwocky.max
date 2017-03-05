'use strict';

module.exports = function( Gibber ) {
  let Max = {
    signals:[],
    params:[],
    devices:{},
    namespaces:{},

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

          if( '__widget__' in genGraph ) {
            genGraph.__widget__.place()
          }

          Gibber.Communication.send( `sig ${signalNumber} expr "${genGraph.out()}"` )
          if( genGraph.isGen ) {
            Gibber.Environment.codeMarkup.TEST = genGraph
          }
        }
        Max.signals[ signalNumber ].id = signalNumber
      }

      for( let param of Max.MOM.root.params ) {
        Max.params[ param.varname ] = function( v ) {
          Gibber.Communication.send( `set ${param.path} ${v}` )
        }
        Gibber.addSequencingToMethod( Max.params, param.varname, 0 )
      }

      for( let device of Max.MOM.root.devices ) {
        const d = Object.assign({}, device) 
        Max.devices[ d.path ] = d
        for( let value of d.values ) {
          d[ value.name ] = function( v ) {
            Gibber.Communication.send( `set ${d.path} ${value.name} ${v}` )           
          } 
          Gibber.addSequencingToMethod( Max.devices[ d.path ], value.name, 0 )
        }
        
        d.__velocity = 127
        d.__duration = 500 
        d.velocity = function( v ) {
          d.__velocity = v
        }
        d.duration = function( v ) {
          d.__duration = v
        }

        Gibber.Environment.codeMarkup.prepareObject( d )

        let seqKey = `${d.path}midinote`

        d.midinote = function( note, velocity, duration ) {
          if( typeof velocity !== 'number' || velocity === 0) velocity = d.__velocity
          if( typeof duration !== 'number' ) duration = d.__duration

          Gibber.Communication.send( `midinote ${d.path} ${note} ${velocity} ${duration}` )
        }

        Gibber.addSequencingToMethod( d, 'midinote', 0 ) 

        Gibber.Seq.proto.externalMessages[ seqKey ] = ( value, beat ) => {
          let msg = `add ${beat} midinote ${d.path} ${value} ${d.__velocity} ${d.__duration}` 
          return msg
        }
      }

      Gibber.Environment.lomView.init( Gibber )
    },

    msg( str ) {
      let msg = {}
      msg.address = msg.path = str
      
      if( Max.namespaces[ str ] ) return Max.namespaces[ str ] 

      let proxy = new Proxy( msg, {
        get( target, prop, receiver ) {
          if( target[ prop ] === undefined && prop !== 'markup' && prop !== 'seq' ) {
            Max.createProperty( target, prop )
          }else{
            if( prop === 'seq' ) {
              if( target[ str ] === undefined ) {
                Max.createProperty( target, str )
              }
              return target[ str ].seq
            }
          }

          return target[ prop ]
        }
      })

      Max.namespaces[ str ] = proxy

      Gibber.Environment.codeMarkup.prepareObject( msg )
      return proxy
    },

    createProperty( target, prop ) {
      Gibber.Seq.proto.externalMessages[ target.address + prop ] = ( value, beat ) => {
        let msg = `add ${beat} ${prop} ${value}`  
        return msg
      }
      Gibber.addMethod( target, prop )
    }
  }

  return Max
}
