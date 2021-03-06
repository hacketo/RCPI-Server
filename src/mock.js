/**
 * Created by hacketo on 09/05/18.
 */

var EventEmitter = require('events');

function Omx(source, output, loop, initialVolume, showOsd){
    var omxplayer = new EventEmitter();
    var player = null;
    var open = false;

    // ----- Local Functions ----- //

    // Marks player as closed.
    function updateStatus () {
        open = false;
        omxplayer.emit('close');

    }

    // Emits an error event, with a given message.
    function emitError (message) {
        open = false;
        omxplayer.emit('error', message);

    }

    // Spawns the omxplayer process.
    function spawnPlayer (src, out, loop, initialVolume, showOsd) {
        console.log('MOCK OMX : args for omxplayer:', src, out, loop, initialVolume, showOsd);
        open = true;
    }

    // Simulates keypress to provide control.
    function writeStdin (value) {

        if (open) {
            console.log("MOCK OMX : "+value);
        } else {
            throw new Error('Player is closed.');
        }

    }

    // ----- Setup ----- //
    if (source) {
        spawnPlayer(source, output, loop, initialVolume, showOsd);
    }

    // ----- Methods ----- //

    // Restarts omxplayer with a new source.
    omxplayer.newSource = function(src, out, loop, initialVolume, showOsd) {

        if (open) {
            writeStdin('q');

        } else {

            spawnPlayer(src, out, loop, initialVolume, showOsd);

        }

    };

    omxplayer.play = function(){ writeStdin('p'); };
    omxplayer.pause = function(){ writeStdin('p'); };
    omxplayer.volUp = function(){ writeStdin('+'); };
    omxplayer.volDown = function(){ writeStdin('-'); };
    omxplayer.fastFwd = function(){ writeStdin('>'); };
    omxplayer.rewind = function(){ writeStdin('<'); };
    omxplayer.fwd30 =function(){ writeStdin('\u001b[C'); };
    omxplayer.back30 = function(){ writeStdin('\u001b[D'); };
    omxplayer.fwd600 = function(){ writeStdin('\u001b[A'); };
    omxplayer.back600 = function(){ writeStdin('\u001b[B'); };
    omxplayer.quit = function(){ writeStdin('q'); };
    omxplayer.subtitles = function(){ writeStdin('s'); };
    omxplayer.info = function(){ writeStdin('z'); };
    omxplayer.incSpeed = function(){ writeStdin('1'); };
    omxplayer.decSpeed = function(){ writeStdin('2'); };
    omxplayer.prevChapter = function(){ writeStdin('i'); };
    omxplayer.nextChapter = function(){ writeStdin('o'); };
    omxplayer.prevAudio = function(){ writeStdin('j'); };
    omxplayer.nextAudio = function(){ writeStdin('k'); };
    omxplayer.prevSubtitle = function(){ writeStdin('n'); };
    omxplayer.nextSubtitle = function(){ writeStdin('m'); };
    omxplayer.decSubDelay = function(){ writeStdin('d'); };
    omxplayer.incSubDelay = function(){ writeStdin('f'); };

    Object.defineProperty(omxplayer, 'running', {
        get: function(){ return open; }
    });

    // ----- Return Object ----- //

    return omxplayer;
}


module.exports = Omx;