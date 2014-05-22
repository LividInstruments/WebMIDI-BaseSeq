/*
This is a primitive sequencing example built around Chris Wilson's WebAudio metronome example https://github.com/cwilso/metronome for best timing practices
This comments out the beeps, and sequences MIDI note output to light the leds on a Livid controller.

*/
                            
//what leds are we sequencing?
var lednn = {}
lednn.Base = leds.Base.pad;
lednn.Alias8 = leds.Alias8.btn;
lednn.CNTRLR = leds.CNTRLR.rowbtn;
lednn.OhmRGB = leds.OhmRGB.grid;
lednn.Ohm64 = leds.Ohm64.grid;

var stepseq = [];
stepseq[0] = [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
var SEQCOUNT = 16;

var prev_select_index = -1;
var prev_step_index = 0;
var doupdateseq = false;

var isPlaying = false;      // Are we currently playing?
var startTime;              // The start time of the entire sequence.
var current16thNote;        // What note is currently last scheduled?
var tempo = 120.0;          // tempo (in beats per minute)
var lookahead = 25.0;       // How frequently to call scheduling function 
                            //(in milliseconds)
var scheduleAheadTime = 0.1;    // How far ahead to schedule audio (sec)
                            // This is calculated from lookahead, and overlaps 
                            // with next interval (in case the timer is late)
var nextNoteTime = 0.0;     // when the next note is due.
var noteResolution = 0;     // 0 == 16th, 1 == 8th, 2 == quarter note
var noteLength = 0.05;      // length of "beep" (in seconds)
var timerID = 0;            // setInterval identifier.

var seqcanvas,                 // the canvas element
    canvasContext,         // canvasContext is the canvas' context 2D
    seqContext;           //audio context for seqeuncer

var lastStepDrawn = -1; // the last "box" we drew on the screen
var lastSelectDrawn = -1 //

var drawinit = false;

var notesInQueue = [];      // the notes that have been put into the web audio,
                            // and may or may not have played yet. {note, time}

// First, let's shim the requestAnimationFrame API, with a setTimeout fallback
window.requestAnimFrame = (function(){
    return  window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function( callback ){
        window.setTimeout(callback, 1000 / 60);
    };
})();

function nextNote() {
    // Advance current note and time by a 16th note...
    var secondsPerBeat = 60.0 / tempo;    // Notice this picks up the CURRENT 
                                          // tempo value to calculate beat length.
    nextNoteTime += 0.25 * secondsPerBeat;    // Add beat length to last beat time

    current16thNote++;    // Advance the beat number, wrap to zero
    if (current16thNote == 16) {
        current16thNote = 0;
    }
}

function scheduleNote( beatNumber, time ) {
  var state = stepseq[select_index][beatNumber]; //is step on or off?
  var mspsn = (60000.0 / tempo)/4; //ms per sixteenth note
  noteLength = mspsn/1000.; //convert to seconds for osc call
  
  // push the note on the queue, even if we're not playing.
  notesInQueue.push( { note: beatNumber, time: time } );

  if ( (noteResolution==1) && (beatNumber%2))
      return; // we're not playing non-8th 16th notes
  if ( (noteResolution==2) && (beatNumber%4))
      return; // we're not playing non-quarter 8th notes

  // create an oscillator - we need this for the timing.
  var osc = seqContext.createOscillator();
  osc.connect( seqContext.destination );
  
  //rudimentary seq
  if(state){
    osc.frequency.value = ((1+beatNumber)*0.5)*220
    osc.start( time );
    osc.stop( time + noteLength );
  }

  //light the leds on the controller
  var color = 'g'
  if (beatNumber % 16 === 0){    // beat 0 == low pitch
      color = 'r';
  }
  else if (beatNumber % 4){    // quarter notes = medium pitch
      color = 'b';
  }
  if(doupdateseq){
    onSelectSeq();
    doupdateseq = false;
  }
  var nn = leds.Base.pad_R[beatNumber];//fetch the note number
  var off = (state>0) ? 'w' : 'off';
  light(nn,color,mspsn,off); //off color is determined by step state
  //clog('seq time '+ time +' len '+ noteLength + ' beat '+beatNumber+' nn '+nn );
}

function scheduler() {
  // while there are notes that will need to play before the next interval, 
  // schedule them and advance the pointer.
  while (nextNoteTime < seqContext.currentTime + scheduleAheadTime ) {
      scheduleNote( current16thNote, nextNoteTime );
      nextNote();
  }
  timerID = window.setTimeout( scheduler, lookahead );
}

function play() {
    isPlaying = !isPlaying;
    
    if (isPlaying) { // start playing
        current16thNote = 0;
        nextNoteTime = seqContext.currentTime;
        scheduler();    // kick off scheduling
        return "stop";
    } else {
        window.clearTimeout( timerID );
        return "play";
    }
}

function calcstep(note){
  if(product=='Base'){
      var BASECOL = 8;
      var BASEROW = 4;
      if(note>35 && note< 68){ //pads
        var notep = note - 36;
        var col = notep%BASECOL;
        var row = Math.floor(notep/BASECOL);
        if( col < (BASECOL/2) ){
          //----select a sound
          //left half of pads 0,1,2,3, 8,9,10,11, 16,17,18,19, 24,25,26,27
          select_index = row*BASEROW+(col);
          clog('select '+select_index);
          //light(leds.Base.pad_R[select_index],'red');
        }else{
          //----edit steps
          //right half of pads 4,5,6,7, 12,13,14,15, 20,21,22,23, 28,29,30,31
          var col_right = col-BASEROW;
          step_index = row*BASEROW+(col_right);
          stepseq[select_index][step_index] = 1-stepseq[select_index][step_index]; //toggle the step state
          var state = stepseq[select_index][step_index];
          var scolor = (state>0) ? 'w' : 'off'; //if state is greater than 0, make it white, otherwise, off.
          light(note,scolor); //light the step you just toggled immediately. 
          clog('step# '+step_index+ ' state '+stepseq[select_index][step_index]+ ' seq '+stepseq[select_index]);
        }
      }
    }
  if(product=='Alias8'){
      var ACOL = 8;
      var AROW = 2;
      if(note>=0 && note<16){ //pads
        var notep = note;
        var col = notep%ACOL;
        var row = Math.floor(notep/ACOL);
        if( col < (ACOL/2) ){
          //left half of pads 0,1,2,3, 8,9,10,11
          select_index = row*AROW+(col);
        }else{
          //right half of pads 4,5,6,7, 12,13,14,15
          var col_right = col-AROW;
          step_index = row*AROW+(col_right);
          stepseq[select_index][num] = 1-val;
        }
      }
    }
    
  if(select_index !== prev_select_index){
    if(isPlaying){
      doupdateseq = true;
    }else{
      onSelectSeq()
    }

  }
  
}

function onSelectSeq(){
  clog('update select'+select_index);
  //light the selection and revert previous selection:
  light(leds.Base.pad_L[select_index],'green');
  light(leds.Base.pad_L[prev_select_index],'blue');
  prev_select_index = select_index;
  
  //update the sequence LEDs:
  for(var i=0;i<stepseq[select_index].length;i++){
    var nn = leds.Base.pad_R[i];
    var state = stepseq[select_index][i];
    var scolor = (state>0) ? 'w' : 'off'; //if state is greater than 0, make it white, otherwise, off.
    light(nn,scolor);
    //clog('update seq'+i+' '+scolor);
  }
}

function addstep(num){
}

function resetCanvas (e) {
    // resize the canvas - but remember - this clears the canvas too.
    seqcanvas.width = window.innerWidth;
    seqcanvas.height = window.innerHeight;

    //make sure we scroll to the top left.
    window.scrollTo(0,0); 
    
    drawinit=true;
    
}

function draw() {
    var currentNote = lastStepDrawn;
    var currentTime = seqContext.currentTime;
    var currentSelect = select_index;
    
    while (notesInQueue.length && notesInQueue[0].time < currentTime) {
        currentNote = notesInQueue[0].note;
        notesInQueue.splice(0,1);   // remove note from queue
    }

    // We only need to draw if the note has moved.
    if ( (lastStepDrawn != currentNote) || drawinit) {
        var x = Math.floor( seqcanvas.width / 20 );
        var xoffset = 4*x;
        //canvasContext.clearRect(0,0,seqcanvas.width, seqcanvas.height); 
        //seq
        for (var i=0; i<16; i++) {
            var col = i%4;
            var row = 3-Math.floor(i/4); //move playhead from bottom left to top right.
            var offcolor = ( stepseq[select_index][i]>0 ) ? '#E6E6E6':'black';
            canvasContext.fillStyle = ( currentNote == i ) ? 
                ((currentNote%4 === 0)?"red":"blue") : offcolor;
            canvasContext.fillRect( xoffset+(x*col), x*row, x/1.1, x/1.1 ); //x,y,w,h
        }
        lastStepDrawn = currentNote;
    }
    
    if (lastSelectDrawn != currentSelect || drawinit) {
        var x = Math.floor( seqcanvas.width / 20 );
        //selector
        for (var i=0; i<16; i++) {
            var col = i%4;
            var row = 3-Math.floor(i/4); //bottom left is 0, top right is 15.
            if(currentSelect == i){
              canvasContext.fillStyle = 'green'
            }else{
              canvasContext.fillStyle = 'blue'
            }
            canvasContext.fillRect( (x*col), x*row, x/1.1, x/1.1 ); //x,y,w,h
        }
        lastSelectDrawn = currentSelect;
        drawinit = false;
    }
    
    // set up to draw again
    requestAnimFrame(draw);
}
function initLEDs(){
  for(i in leds.Base.pad_L){
    light(leds.Base.pad_L[i],'blue');
  }
  onSelectSeq();
}

function initseq(){
    clog('init sequencer');
    
    //initialize the sequences:
    for(var i=0;i<SEQCOUNT;i++){
      stepseq[i]=[0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0];
    }
        
    var container = document.createElement( 'div' );

    container.className = "container";
    seqcanvas = document.createElement( 'canvas' );
    canvasContext = seqcanvas.getContext( '2d' );
    seqcanvas.width = window.innerWidth; 
    seqcanvas.height = window.innerHeight; 
    document.body.appendChild( container );
    container.appendChild(seqcanvas);    
    canvasContext.strokeStyle = "#ffffff";
    canvasContext.lineWidth = 2;
    
    seqContext = new AudioContext();
    
    // if we wanted to load audio files, etc., this is where we should do it.

    window.onorientationchange = resetCanvas;
    window.onresize = resetCanvas;

    requestAnimFrame(draw);    // start the drawing loop.
}

window.addEventListener("load", initseq );

