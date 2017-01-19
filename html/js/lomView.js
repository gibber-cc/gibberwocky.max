require( './vanillatree.js' )

let Gibber = null, count = -1

let lomView = {
  tree: null,

  init( _gibber ) {
    Gibber = _gibber
    this.setup()
    this.create()

    count++
    if( count )
      Gibber.log( 'the live object model (lom) has been updated.' )
  },

  setup() {
    document.querySelector( '#lomView' ).innerHTML = ''

    this.tree = new VanillaTree('#lomView', {
      placeholder: ''
      //contextmenu: [{
      //  label: 'Label 1',
      //  action: function(id) {
      //    // someAction
      //  }
      //},{
      //  label: 'Label 2',
      //  action: function(id) {
      //    // someAction
      //  }
      //}]
    })
    //elem.addEventListener( 'vtree-select', function( evt ) {
    //  console.log( evt, evt.detail )
    //});
  },

  processDevice( device, id ) {
    lomView.tree.add({ label:device.path, id:device.path }) 
    for( let value of device.values ) {
      let deviceID = value.name // device.title
      lomView.tree.add({ label:deviceID, id:deviceID, parent:device.path })
    }
  },

  create() {
    for( let deviceName in Gibber.Max.devices ) {
      lomView.processDevice( Gibber.Max.devices[ deviceName ] )
    }
    //Gibber.Live.returns.forEach( v => lomView.processTrack( v ) ) // 'return ' + v.id ) )
    //lomView.processTrack( Gibber.Live.master )
  }
}

module.exports = lomView 
