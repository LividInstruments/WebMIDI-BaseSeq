# Web MIDI and Web Audio based Sequencer for Livid BASE

This is a simple step sequencer designed for the Livid Base that uses WebMIDI and WebAudio standards.
At the time of this writing, Chrome Canary and Chrome Stable (33) have the only such implementation. 
There are some basic examples of lighting LEDs, getting MIDI data printed into text inputs in the DOM, and a basic sequencer that colors squares in the webpage in sync with the LEDs on the Livid Controller. The sounds are very basic oscillators.

The Web MIDI flag MUST be enabled via chrome://flags/#enable-web-midi
and make sure your Chrome is up to date via chrome://chrome/

Adapted from Chris Wilson's Web Audio and Web MIDI examples:
[Drum Machine](http://webaudiodemos.appspot.com/MIDIDrums/index.html)
[MIDI Synth](http://webaudiodemos.appspot.com/midi-synth/index.html)
[Metronome](https://github.com/cwilso/metronome)
