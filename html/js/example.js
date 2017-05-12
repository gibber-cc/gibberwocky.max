const Examples = {
  introduction:`/* gibberwocky.max - introduction
 * 
 * This introduction assumes that your controlling the gibberwocky
 * object's help patch in Max. Otherwise your mileage will vary.
 *
 * After playing around here, check out some of the tutorials
 * found in the sidebar on the right. To execute any line of
 * code, hit Ctrl+Enter. Feel free to modify and re-execute
 * at any time. To stop all running sequences, hit Ctrl+. (period).
 */

// start kick drum on Max for Live device
devices['amxd~'].midinote.seq( 36, 1/4, 1 )

// randomly pick between open and closed hi-hats
// and eighth notes vs. 1/16th notes. If 1/16th
// notes are played, always play two back to back.
devices['amxd~'].midinote.seq( [42,46].rnd(), [1/8,1/16].rnd(1/16,2) )

// create namespaces named 'bell' and 'squelch' 
// and sequence bangs at different rhythms
namespace('bell').seq( 1, [1/8,1/16,1/4].rnd(1/16,2) )
namespace('squelch').seq( 1, [1/4,1/16,1].rnd(1/16,4) )

// set values of named UI elements in patcher interface
params['White_Queen'].seq( [32,64,92,127], 1  )
params['Red_Queen'].seq( [32,64,96,127], 1 ) 

// rotate and reverse sequences over time
params['Red_Queen'][0].values.rotate.seq( 1, 2 )
params['White_Queen'][0].values.reverse.seq( 1, 4 )

// send a sine wave out outlet 2 (the first signal outlet)
signals[0]( cycle(.1) )

// send a ramp lasting 16 beats out outlet 2
signals[1]( beats(16) )

// send a reverse sawtooth out outlet 3
signals[2]( sub(1,phasor( 1 ) ) )  

// send a sine wave with a modulated frequency out outlet 4
signals[3]( mul( cycle( mul(beats(8), .5 ) ), .15 ) )
`,

['tutorial 1: basic messaging']:

`/*
 * gibberwocky.max - tutorial #1: basic messaging
 *
 * This first intro will explain how to execute code, send
 * MIDI note messages, sequence arbitrary messages, and 
 * control UI objects.
 *
 * To start make sure you open the patch: 
 * gibberwocky_tutorial_2-5
 *  ... that is included in the gibberwocky pacakge.
*/

// Messaging in gibberwocky.max can be done in two ways. First, 
// we can send messages out the first outlet of the gibberwocky.max
// object. To do this, we specify 'namespaces' where each
// namespace represents the first part of messages that are sent. Thus,
// you could create namespaces for individual instruments, or Max objects,
// or any other routing scheme you can come up with.

// Let's start by sending the following message 'synth1 1'. Connect the left
// most outlet of the gibberwocky object in Max to a print object, and then
// run the following three lines code and look at the console in Max:
synth1 = namespace('synth1') 
synth1( 1 )
synth1( 'test' )

// You can add an extra prefix to your message by appending a property:
synth1.gollygee( 'willickers?' )

// If you use [route], [routpass], or [sel] objects in Max/MSP you can easily direct 
// messages to variety of destinations in this way. 

// gibberwocky can also easily target Max for Live devices embedded in Max
// patches. In the patcher for this tutorial there's an included Laverne
// instrument. If you click on the 'scene' tab of the gibberwocky sidebar, 
// you'll see a tree browser with a 'devices' branch. Open that branch to see all 
// Max for Live devices available in your patch. Now click on the branch for the device
// you want to send a midinote message to. The associated object path is automatically 
// inserted into your code editor at the current cursor position. Add a call to midinote to the end of this
// code snippet; it should look similar to the following:

devices['amxd~'].midinote( 60 ) // send middle C

// Now uncollapse the branch for your device in the scene browser. This lists
// all the parameters exposed for control on the Max for Live devie. Click on any
// leaf to insert the full path to the control into your code editor. Assuming you chose
// the 'filter_resonance' property you should see the following:

devices['amxd~']['filter_resonance']

// This points to a function; we can pass this function a value to manipulate the
// control.

devices['amxd~']['filter_resonance'](0)

// If you've used gibberwocky.live before, it's important to note that these controls
// do not default to a range of {0,1}, although for the resonance parameter that happens
// to be the correct range. For other controls it will be different.

// OK, that's some basics out of the way. Try the sequencing tutorial next!`,

[ 'tutorial 2: basic sequencing' ]: `/* gibberwocky.midi - tutorial #2: basic sequencing
 *
 * This tutorial will provide an introdution to sequencing messages in gibberwocky. In
 * order for sequencing in gibberwocky.max to work, you must start the Global Transport
 * running in Max/MSP. You can find this Max's menuabr under Window > Global Transport.
 */

// In tutorial #1, we saw how we could send MIDI messages to specific MIDI
// channel objects. We can easily sequence any of these methods by adding
// a call to .seq(). For example:

// send noteon message with a first value of 60
devices['amxd~'].midinote( 60 )

// send same value every quarter note
devices['amxd~'].midinote.seq( 60, 1/4 )

// You can stop all sequences in gibberwocky with the Ctrl+. keyboard shortcut
// (Ctrl + period). You can also stop all sequences on a specific channel:

devices['amxd~'].stop()

// Most sequences in gibberwocky contain values (60) and timings (1/4). To
// sequence multiple values we simply pass an array:

devices['amxd~'].midinote.seq( [60,72,48], 1/4 )

// ... and we can do the same thing with multiple timings:

devices['amxd~'].midinote.seq( [60,72,48], [1/4,1/8] )

// We can also sequence our note velocities and durations.
devices['amxd~'].midinote.seq( 60, 1/2 )
devices['amxd~'].velocity.seq( [16, 64, 127], 1/2 )
devices['amxd~'].duration.seq( [10, 100,500], 1/2 )

// the same idea works for CC messages:
devices['amxd~'].cc0( 64 )
devices['amxd~'].cc0.seq( [0, 64, 127], 1/8 )

// If you experimented with running multiple variations of the midinote 
// sequences you might have noticed that only one runs at a time. For example,
// if you run these two lines:

devices['amxd~'].midinote.seq( 72, 1/4 )
devices['amxd~'].midinote.seq( 48, 1/4 )

// ...you'll notice only the second one actually triggers. By default, gibberwocky
// will replace an existing sequence with a new one. To stop this, you can pass an ID number 
// as a third argument to calls to .seq(). In the examples of sequencing we've seen so far,
// no ID has been given, which means gibberwocky is assuming a default ID of 0 for each
// sequence. When you launch a sequence on a channel that has the same ID as another running 
// sequence, the older sequence is stopped. If the sequences have different IDs they run 
// concurrently. Note this makes it really easy to create polyrhythms.

devices['amxd~'].midinote.seq( 48, 1 ) // assumes ID of 0
devices['amxd~'].midinote.seq( 60, 1/2, 1 ) 
devices['amxd~'].midinote.seq( 72, 1/3, 2 ) 
devices['amxd~'].midinote.seq( 84, 1/7, 3 ) 

// We can also sequence calls to midichord. You might remember from the first tutorial
// that we pass midichord an array of values, where each value represents one note. This
// means we need to pass an array of arrays in order to move between different chords.

devices['amxd~'].midichord.seq( [[60,64,68], [62,66,72]], 1/2 )

// Even we're only sequencing a single chord, we still need to pass a 2D array. Of course,
// specifying arrays of MIDI values is not necessarily an optimal representation for chords.
// Move on to tutorial #3 to learn more about how to leverage music theory in gibberwocky.
`,

['tutorial 3: harmony'] :`
/* gibberwocky.midi - tutorial #3: Harmony
 *
 * This tutorial covers the basics of using harmony in gibberwocky.midi. It assumes you
 * know the basics of sequencing (tutorial #2) and have an appropriate MIDI output setup.
 *
 * In the previous tutorials we looked at using raw MIDI values to send messages. However,
 * using MIDI note numbers is not an ideal representation. gibberwocky includes knoweldge of
 * scales, chords, and note names to make musical sequencing easier and more flexible. In this
 * tutorial, instead of using channel.midinote() and channel.midichord() we'll be using 
 * channel.note() and channel.chord(). These methods use gibberwocky's theory objects to
 * determine what MIDI notes are eventually outputted.
 */

// In our previous tutorial, we sent out C in the fourth octave by using MIDI number 60:
devices['amxd~'].midinote( 60 )

// We can also specify notes with calls to the note() method by passing a name and octave.
devices['amxd~'].note( 'c4' )
devices['amxd~'].note( 'fb3' )

devices['amxd~'].note.seq( ['c4','e4','g4'], 1/8 )

// remember, Ctrl+. stops all running sequences.

// In gibberwocky, the default scale employed is C minor, starting in the fourth octave. 
// This means that if we pass 0 as a value to note(), C4 will also be played.
devices['amxd~'].note( 0 )

// sequence C minor scale, starting in the fourth octave:
devices['amxd~'].note.seq( [0,1,2,3,4,5,6,7], 1/8 )

// negative scale indices also work:
devices['amxd~'].note.seq( [-7,-6,-5,-4,-3,-2,-1,0,1,2,3,4,5,6,7], 1/8 )

// there is a global Scale object we can use to change the root and mode
// for all scales. Run the lines below individually  with the previous note sequence running.
Scale.root( 'd4' )
Scale.mode( 'lydian' )

Scale.root( 'g2' )
Scale.mode( 'phrygian' )

// We can also sequence changes to the root / mode:
Scale.root.seq( ['c2','d2','f2,'g2'], 2 )
Scale.mode.seq( ['lydian', 'ionian', 'locrian'], 2 )

// We can also define our own scales using chromatic scale indices. Unfortunately, 
// microtuning with MIDI is very diffcult, so only the standard eleven notes of 
// Western harmony are supported. Scales can have arbtrary numbers of notes.
Scale.modes[ 'my mode' ] = [ 0,1,2,3,5,6,10 ]
Scale.mode( 'my mode' )

Scale.modes[ 'another mode' ] = [0,1]
Scale.mode( 'another mode' )

Scale.mode.seq( ['my mode', 'another mode'], 4 )

/******** chords **********/
// Last but not least there are a few different ways to specify chords in gibberwocky.
// First, we can use note names:

devices['amxd~'].chord( ['c4','eb4','gb4','a4'] )

// Or we can use scale indices:
devices['amxd~'].chord( [0,2,4,5] )

devices['amxd~'].chord.seq( [[0,2,4,5], [1,3,4,6]], 1 )

// We can also use strings that identify common chord names.
devices['amxd~'].chord( 'c4maj7' )
devices['amxd~'].chord( 'c#4sus7b9' )

devices['amxd~'].chord.seq( ['c4dim7', 'bb3maj7', 'fb3aug7'], 2 )

// OK, that's harmony in a nutshell. Next learn a bit about patterns and
// pattern manipulation in gibberwocky in tutorial #4.`,

['tutorial 4: patterns and pattern transformations']:`/* gibberwocky.midi - tutorial #4: Patterns and Transformations
 *
 * This tutorial covers the basics of using patterns in gibberwocky.midi. It assumes you
 * know the basics of sequencing (tutorial #2) and have an appropriate MIDI output setup.
 *
 * In tutorial #2 we briefly mentioned that sequences consist of values and timings. These
 * are both stored in Pattern objects in gibberwocky, and these patterns can be controlled
 * and manipulated in a variety of ways over time.
 */
   
// Make sure the console is open in your sidebar to see the calls to Gibber.log()
// Create a Pattern with some initial values.
myvalues = Pattern( 60,62,64,65 )

Gibber.log( myvalues() ) // 60
Gibber.log( myvalues() ) // 62
Gibber.log( myvalues() ) // 64
Gibber.log( myvalues() ) // 65
Gibber.log( myvalues() ) // back to 60...

// sequence using this pattern:
devices['amxd~'].midinote.seq( myvalues, 1/8 )

// Everytime we pass values and timings to .seq(), it converts these into Pattern objects
// (unless we're already passing a Pattern object(s)). Remember from tutorial #2 that
// all of our sequences have an ID number, which defaults to 0. We can access these patterns
// as follows:

devices['amxd~'].midinote.seq( [36,48,60,72], [1/2,1/4] )
Gibber.log( devices['amxd~'].midinote[0].values.toString() ) 
Gibber.log( devices['amxd~'].midinote[0].timings.toString() ) 

// Now that we can access them, we can apply transformations:

devices['amxd~'].midinote[0].values.reverse()
devices['amxd~'].midinote[0].values.transpose( 1 ) // add 1 to each value
devices['amxd~'].midinote[0].values.scale( 1.5 )   // scale each value by .5
devices['amxd~'].midinote[0].values.rotate( 1 )    // shift values to the right
devices['amxd~'].midinote[0].values.rotate( -1 )   // shift values to the left
devices['amxd~'].midinote[0].values.reset()        // reset to initial values

// We can sequence these transformations:
devices['amxd~'].midinote[0].values.rotate.seq( 1,1 )
devices['amxd~'].midinote[0].values.reverse.seq( 1, 2 )
devices['amxd~'].midinote[0].values.transpose.seq( 1, 2 )
devices['amxd~'].midinote[0].values.reset.seq( 1, 8 )

// This enables us to quickly create variation over time. One more tutorial to go!
// Learn more about creating synthesis graphs for modulation in tutorial #5.`,
 
['tutorial 5: modulating with gen~'] :
 `/* Gen is an extension for Max for Live for synthesizing audio/video signals.
LFOs, ramps, stochastic signals... Gen can create a wide variety of modulation sources for
exploration.

We've seen that the first outlet of gibberwocky is used for messaging. The remaining outlets
are used for signals created by Gen objects. You can determine the number of outlets
using the @signals property; for example, [gibberwocky @signals 4], as seen in the gibberwocky
help patch, has four outputs for audio signals in addtion to its messaging output (for a total
of 5).
*/

// Let's experiment! Create a [gibberwocky @signals 1] object and connect the rightmost outlet
// to a [scope~]. We can send a simple ramp as follows:
signals[0]( phasor(1) )

// This creates a sawtooth wave with a range of {0,1}. We can also do sine waves:
signals[0]( cycle(1) )

// Note that the cycle ugen generates a full bandwidth audio signal with a range of {-1,1}
// Often times we want to specify a center point (bias) for our sine oscillator, in addition to 
// a specific amplitude and frequency. The lfo() function provides a simpler syntax for doing this:

// frequency, amplitude, bias
mylfo = lfo( 2, .2, .7 )

signals[0]( mylfo )

// We can also easily sequence parameters of our LFO XXX CURRENTLY BROKEN:

mylfo.frequency.seq( [ .5,1,2,4 ], 2 )

/* ... as well as sequence any other parameter in Live controlled by a genish.js graph. Although the lfo()
ugen provides named properties for controlling frequency, amplitude, and centroid, there is a more
generic way to sequence any aspect of a gen~ ugen by using the index operator ( [] ). For example,
cycle() contains a single inlet that controls its frequency, to sequence it we would use: */

mycycle = cycle( .25 )

mycycle[ 0 ].seq( [ .25, 1, 2 ], 1 )

signals[0]( add( .5, div( mycycle, 2 ) ) )

/*For other ugens that have more than one argument (see the genish.js random tutorial for an example) we
simply indicate the appropriate index... for example, mysah[ 1 ] etc. For documentation on the types of
ugens that are available, see the gen~ reference: https://docs.cycling74.com/max7/vignettes/gen~_operators*/`, 

[ 'using the Score() object' ]  : 
`// Scores are lists of functions with associated
// relative time values. In the score below, the first function has
// a time value of 0, which means it begins playing immediately. The
// second has a value of 1, which means it beings playing one measure
// after the previously executed function. The other funcions have
// timestamps of two, which means they begins playing two measures after
// the previously executed function. Scores have start(), stop(),
// loop(), pause() and rewind() methods.

s = Score([
  0, ()=> devices['amxd~'].note.seq( -14, 1/4 ),
 
  1, ()=> channels[1].note.seq( [0], Euclid(5,8) ),
 
  2, ()=> {
    arp = Arp( [0,1,3,5], 3, 'updown2' )
    channels[ 2 ].velocity( 8 )
    channels[ 2 ].note.seq( arp, 1/32 )
  },
 
  2, ()=> arp.transpose( 1 ),
 
  2, ()=> arp.shuffle()
])

// Scores can also be stopped automatically to await manual retriggering.

s2 = Score([
  0,   ()=> channels[ 0 ].note( 0 ),

  1/2, ()=> channels[ 0 ].note( 1 ),

  Score.wait, null,

  0,   ()=> devices['amxd~'].note( 2 )
])

// restart playback
s2.next()

// CURRENTLY BROKEN
/* The loop() method tells a score to... loop. An optional argument specifies
 * an amount of time to wait between the end of one loop and the start of the next.*/

s3 = Score([
  0, ()=> channels[ 0 ].note.seq( 0, 1/4 ),
  1, ()=> channels[ 0 ].note.seq( [0,7], 1/8 ),
  1, ()=> channels[ 0 ].note.seq( [0, 7, 14], 1/12 )
])

s3.loop( 1 )
`,

['using the Arp() object (arpeggiator)']:
`/*
  * This tutorial assumes familiarity with the material
  * covered in tutorials 2–4.
  *
  * The Arp() object creates wrapped Pattern objects (see tutorial
  * #4) that are simply functions playing arpeggios. However,
  * the pattern transformations available in gibberwocky open
  * up a great deal of flexiblity in manipulating these arpeggios.
  */

// Make an arp: chord, number of octaves, mode.
myarp = Arp( [0,2,4,5], 4, 'updown' )

// other modes include 'up' and 'down'. XXX updown2 is broken :( 

// play arpeggiator with 1/16 notes
devices['amxd~'].note.seq( myarp, 1/16 )

// change root of Scale (see tutorial #3)
Scale.root( 'c2' )

// randomize arpeggiator
myarp.shuffle()

// transpose arpeggiator over time
myarp.transpose.seq( 1,1 )

// reset arpeggiator
myarp.reset()

// stop arpeggiator
devices['amxd~'].stop()

// The Arp() object can also be used with MIDI note values instead of
// gibberwocky's system of harmony. However, arp objects are designed
// to work with calls to note() by default, accordingly, they tranpose
// patterns by seven per octave (there are seven notes in a scale of one
// octave). For MIDI notes, there are 12 values... we can specify this
// as a fourth parameter to the Arp() constructor.

midiArp = Arp( [60,62,64,67,71], 4, 'down', 12 )

devices['amxd~'].midinote.seq( midiArp, 1/32 )

// bring everything down an octace
midiArp.transpose( -12 )

// change number of octaves
midiArp.octaves = 2
`,

['using the Euclid() object (euclidean rhythms)'] :
`/*
  * This tutorial assumes familiarty with the material
  * covered in tutorial #2. It will cover the basics of
  * working with Euclidean rhythms in gibberwocky.
  *
  * Euclidean rhythms are specifcations of rhythm using
  * a number of pulses allocated over a number of beats.
  * The algorithm attempts to distribute the pulses as
  * evenly as possible over all beats while maintaining
  * a grid. You can read a paper describing this here:
  *
  * http://archive.bridgesmathart.org/2005/bridges2005-47.pdf
  *
  * For example, consider the rhythm '5,8' where there
  * are 5 pulses over the span of eight notes while
  * maintaining a temporal grid. The algorithm distributes 
  * these as follows: "x.xx.xx." where 'x' represents a pulse
  * and '.' represents a rest. Below are a few other examples:
  *
  * 1,4 : x...
  * 2,3 : x.x
  * 2,5 : x.x..
  * 3,5 : x.x.x
  * 3,8 : x..x..x.
  * 4,9 : x.x.x.x..
  * 5,9 : x.x.x.x.x
  *
  * In gibberwocky, by default the number of beats chosen
  * also determines the time used by each beat; selecting
  * '5,8' means 5 pulses spread across 8 1/8 notes. However,
  * you can also specify a different temporal resolution for
  * the resulting pattern: '5,8,1/16' means 5 pulses spread
  * across 8 beats where each beat is a 1/16th note.
  *
  * You can specify Euclidean rhyhtms using the Euclid()
  * function, which returns a pattern (see tutorial #4);
  * in the example below I've assigned this to the variable E.
  */

// store for faster reference
E = Euclid

// 5 pulses spread over 8 eighth notes
devices['amxd~'].midinote.seq( 60, E(5,8) )

// 3 pulses spread over 8 sixteenth notes
devices['amxd~'].midinote.seq( 48, E( 3, 8, 1/16 ), 1  )

// a quick way of notating x.x.
devices['amxd~'].midinote.seq( 36, E(2,4), 2 ) 

// because Euclid() generates Pattern objects (see tutorial #3)
// we can transform the patterns it generates:

devices['amxd~'].midinote[1].timings.rotate.seq( 1,1 )

`,


['using the Steps() object (step-sequencer)'] : `/* Steps() creates a group of sequencer objects. Each
 * sequencer is responsible for playing a single note,
 * where the velocity of each note is determined by
 * a hexadecimal value (0-f), where f is the loudest note.
 * A value of '.' means that no MIDI note message is sent
 * with for that particular pattern element.
 *
 * The lengths of the patterns found in a Steps object can
 * differ. By default, the amount of time for each step in
 * a pattern equals 1 divided by the number of steps in the
 * pattern. In the example below, most patterns have sixteen
 * steps, so each step represents a sixteenth note. However,
 * the first two patterns (60 and 62) only have four steps, so
 * each is a quarter note. 
 *
 * The individual patterns can be accessed using the note
 * numbers they are assigned to. So, given an instance with
 * the name 'a' (as below), the pattern for note 60 can be
 * accessed at a[60]. Note that you have to access with brackets
 * as a.60 is not valid JavaScript.
 *
 * The second argument to Steps is the channel to target. Note
 * that while the example below is designed to work with the
 * Analogue Drums device found in the gibberwocky help file,
 * that instrument is NOT velocity sensitive. 
 */

steps = Steps({
  [36]: 'ffff', 
  [38]: '.a.a',
  [41]: '........7.9.c..d',
  [43]: '..6..78..b......',
  [45]: '..c.f....f..f..3',  
  [42]: '.e.a.a...e.a.e.a',  
  [46]: '..............e.',
}, devices['amxd~'] )

// rotate one pattern (assigned to midinote 71)
// in step sequencer  every measure
steps[42].rotate.seq( 1,1 )

// reverse all steps each measure
steps.reverse.seq( 1, 2 )`,

}

module.exports = Examples
