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
      Gibber.log( 'The Max scene has been updated.' )
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
    //document.querySelector('#lomView').addEventListener( 'vtree-select', function( evt ) {
    //  console.log( evt, evt.detail )
    //});
  },

  onLeafClick( leaf, evt ) {
    let path = decodeURI( leaf.name ),
        split = path.split(':::'),
        txt

    if( split.length === 3 ) {
      txt = split[0] + "['" + split[1] + "']['" + split[2] + "']"
    }else if( split.length === 2 ) {
      if( split[0] === 'namespaces' ) {
        txt = "namespace('" + split[1] + "')"
      }else{
        txt = split[0] + "['" + split[1] + "']"
      }
    }

    const cursorPos = Gibber.Environment.codemirror.getCursor()
    const end = Object.assign( {}, cursorPos )

    //end.ch += 1
    
    //console.log('leaf click', leaf, evt )

    if( txt !== undefined ) { // if they click on an collapse/uncollapse widget
      if( evt.path[0].className !== 'vtree-toggle' ) {
        Gibber.Environment.codemirror.replaceRange( txt, cursorPos, end )
        Gibber.Environment.codemirror.focus()
      }
    }
    
    // prevent re-adding device['blah'] to end of string
    return split.length === 3 
  },

  processDevice( device, id ) {
    lomView.tree.add({ label:device.path, id:device.path, parent:'devices' }) 
    for( let value of device.values ) {
      let deviceID = value.name // device.title
      lomView.tree.add({ label:deviceID, id:deviceID, parent:device.path })
    }
  },

  create() {
    let paramsBranch = lomView.tree.add({ label:'params', id:'params', opened:true })
    for( let param of Gibber.Max.MOM.root.params ) {
      lomView.tree.add({ label:param.varname, id:param.varname, parent:'params', opened:true })
    }

    let namespaceBranch = lomView.tree.add({ label:'namespaces', id:'namespaces', opened:true })
    for( let ns of Gibber.Max.MOM.namespaces ) {
      lomView.tree.add({ label:ns, id:ns, parent:'namespaces' })
    }

    let deviceBranch = lomView.tree.add({ label:'devices', id:'devices', opened:true })
    for( let deviceName in Gibber.Max.devices ) {
      lomView.processDevice( Gibber.Max.devices[ deviceName ] )
    }
  }
}

module.exports = lomView 
