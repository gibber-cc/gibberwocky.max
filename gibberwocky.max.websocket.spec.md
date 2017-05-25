# Gibberwocky for Max websocket protocol

Gibberwocky communicates with Max using a websocket protocol outlined here. Theoretically any other client should also be able to interface with Max using this same websocket protocol. (And vice versa, alternate gibberwocky hosts could implement with clients using this protocol.)

## Timing

Every time the Max transport advances a beat, the gibberwocky object sends a request to clients for the subsequent beat's events. For example, on beat 3, gibberwocky will send a request for all events that should occur during beat 4. This one beat of latency ensures that all messages arrive with plenty of time to spare. 

Read more about the project here: [http://homes.create.aau.dk/dano/nime17/papers/0024/paper0024.pdf](http://homes.create.aau.dk/dano/nime17/papers/0024/paper0024.pdf)

## What the client (browser) sends to Max:

Most messages can be either prefixed with timing info for scheduling in the future (the "add <time in beats> " prefix), or this prefix can be ommitted, in which case the message will be executed as soon as it arrives. For example, to send a MIDI note immediately use "midinote pitch velocity duration" instead of "add time pitch velocity duration".

Messages are sent as regular strings with spaces for arguments. Multiple messages can be packed into a single packet send by delimiting with the "|" bar symbol. 

### Global

```get_scene``` -- requests Gibberwocky to inspect the patcher's available modulation points. The response will be a stringified JSON dictionary. Typically send this message when the client connects to Gibberwocky.

### Params

```set <name> <message...>```

sends a message to any valid object via its scripting name (via pattrforward)
- name: the valid scripting name / pattr path of the target object
- message: one or more arguments (space delimited) that forms the message sent

E.g. ```add 2.5 set live.dial 74``` means at time 2.5 beats send the message ```74``` to the max object named ```live.dial```. 

E.g. ```set amxd~ snare-decay 300``` means immediately send the message ```snare-decay 300``` to the max object named ```amxd~```. 

### MIDI notes

```midinote <name> <pitch> <velocity> <duration>```

triggers a MIDI note on a device in the patcher.
- name: the scripting name of the device
- pitch, velocity: MIDI values in 0-127
- duration: in milliseconds

E.g. ```add 1 midinote drums 42 127 500``` schedules a midinote at beat 1.0 on the device named "drums" with pitch 42, velocity 127, and duration 500ms.

### Signals

Messages to control the audio signal outlets of gibberwocky use the ```sig``` prefix, followed by an index number, where the first signal outlet is index 0, etc. 

```sig <index> expr <genexpr>```

defines a new signal modulation for one of the gibberwocky signal outlets.
- index: the signal outlet index, where the first signal outlet is 0, the second is 1, etc.
- genexpr: a string of valid GenExpr code (see [documentation](https://docs.cycling74.com/max7/vignettes/gen_genexpr)) which defines one output (e.g. ```out1=0.5;```).

E.g. ```add 0.5 sig 0 expr "Param p0(5); out1=cycle(p0);"``` will assign a 5Hz oscillator to the first signal outlet of gibberwocky at time 0.5 beats.

```sig <index> param <name> <value>```

changes a param defined in the genexpr.
- index: as above
- name: the name of the ```param``` object in the genexpr.
- value: the new value for this param

E.g. ```add 1.0 sig 0 param p0 13``` will set the param ```p0``` of the signal graph in the first signal outlet of gibberwocky to a value of 13, at the time 1.0 beats.

```sig <index> clear```

removes the genexpr, but holds the last output signal value as a constant
- index: as above

```sig <index> zero```

removes the genexpr, and sets the output value to zero
- index: as above

### Generic messages

Any other messages received that do not match ```get_scene```, ```set```, ```midinote```, or ```sig``` will be forwarded to the first outlet of the gibberwocky object for handling in the patcher. 

## What Max sends to the client:

### The scene

In response to a ```get_scene``` message, gibberwocky will send a representation of addressable parts of the Max patcher to all connected clients. This will also be updated and sent whenever the patcher is saved. The scene is sent as a stringified JSON object, which can be turned into a Javascript object via ```JSON.parse(scene)```. 

A quick way of detecting this message is to check if the message's first character is "{" curly parenthesis.

### Timing

```seq <beat>```

This message is sent on every beat, and is a request for clients to reply with all events to occur within the specified beat. See the explanation of timing above.

Other messages are for information only and do not expect responses:

```ply <N>``` -- the play state, either 1 (playing) or 0 (stopped)
```bit <N>``` -- the current beat
```bar <N>``` -- the current bar
```bpm <N>``` -- the current BPM
```sig <S>``` -- the current time signature

### Feedback

```err <message...>``` 

errors posted to the Max window will also be sent to clients here.

```snapshot <index> <value> <index> <value>...``` 

a representation of the current values of the gibberwocky signal outlets. The list is also space-delimited, and comes in pairs of signal index and signal value. This is useful for providing visual feedback of signal modulations within clients.

E.g. ```snapshot 0 0.5 1 0.1234 2 0.74```

