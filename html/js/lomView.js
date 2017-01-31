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
    lomView.tree.add({ label:device.path, id:device.path, parent:'devices' }) 
    for( let value of device.values ) {
      let deviceID = value.name // device.title
      lomView.tree.add({ label:deviceID, id:deviceID, parent:device.path })
    }
  },

  create() {
    let paramsBranch = lomView.tree.add({ label:'params', id:'params' })
    for( let param of Gibber.Max.MOM.root.params ) {
      lomView.tree.add({ label:param.varname, id:param.varname, parent:'params' })
    }

    let namespaceBranch = lomView.tree.add({ label:'namespaces', id:'namespaces' })
    for( let ns of Gibber.Max.MOM.namespaces ) {
      lomView.tree.add({ label:ns, id:ns, parent:'namespaces' })
    }

    let deviceBranch = lomView.tree.add({ label:'devices', id:'devices' })
    for( let deviceName in Gibber.Max.devices ) {
      lomView.processDevice( Gibber.Max.devices[ deviceName ] )
    }
    //Gibber.Live.returns.forEach( v => lomView.processTrack( v ) ) // 'return ' + v.id ) )
    //lomView.processTrack( Gibber.Live.master )
  }
}

module.exports = lomView 
