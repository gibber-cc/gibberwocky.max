'use strict';

module.exports = function( Gibber ) {
  let Max = {
    init() {
      
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


