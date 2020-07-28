/**
 * Created by hacketo on 09/05/18.
 */

const EventEmitter = require('events');

/**
 *
 * @param {string} source
 * @param {string} output - 'hdmi', 'local', 'both', 'alsa'
 * @param {boolean=} loop
 * @param {number=} initialVolume
 * @param {boolean=} showOsd
 * @param {Array=} customArgs
 * @return {EventEmitter}
 */
function Omx(source, output, loop, initialVolume, showOsd, customArgs){
  const omxplayer = new EventEmitter();
  const player = null;
  let open = false;

    // ----- Local Functions ----- //

    // Marks player as closed.
  function updateStatus() {
    open = false;
    omxplayer.emit('close');

  }

    // Emits an error event, with a given message.
  function emitError(message) {
    open = false;
    omxplayer.emit('error', message);

  }

    // Spawns the omxplayer process.
  function spawnPlayer(src, out, loop, initialVolume, showOsd, customArgs) {
    console.log('MOCK OMX : args for omxplayer:', src, out, loop, initialVolume, showOsd, customArgs);
    open = true;
  }

    // Simulates keypress to provide control.
  function writeStdin(value) {

    if (open) {
      console.log(`MOCK OMX : ${value}`);
    } else {
      throw new Error('Player is closed.');
    }

  }

    // ----- Setup ----- //
  if (source) {
    spawnPlayer(source, output, loop, initialVolume, showOsd, customArgs);
  }


    // ----- Methods ----- //
    /**
     *
     * Restarts omxplayer with a new source.
     * @param {string} src
     * @param {string} out - 'hdmi', 'local', 'both', 'alsa'
     * @param {boolean=} loop
     * @param {number=} initialVolume
     * @param {boolean=} showOsd
     * @param {Array=} customArgs
     */
  omxplayer.newSource = function(src, out, loop, initialVolume, showOsd, customArgs) {

    if (open) {
      writeStdin('q');

    } else {

      spawnPlayer(src, out, loop, initialVolume, showOsd, customArgs);

    }

  };

  omxplayer.play = writeStdin.bind(undefined, 'p');
  omxplayer.pause = writeStdin.bind(undefined, 'p');
  omxplayer.volUp = writeStdin.bind(undefined, '+');
  omxplayer.volDown = writeStdin.bind(undefined, '-');
  omxplayer.fastFwd = writeStdin.bind(undefined, '>');
  omxplayer.rewind = writeStdin.bind(undefined, '<');
  omxplayer.fwd30 = writeStdin.bind(undefined, '\u001b[C');
  omxplayer.back30 = writeStdin.bind(undefined, '\u001b[D');
  omxplayer.fwd600 = writeStdin.bind(undefined, '\u001b[A');
  omxplayer.back600 = writeStdin.bind(undefined, '\u001b[B');
  omxplayer.quit = writeStdin.bind(undefined, 'q');
  omxplayer.subtitles = writeStdin.bind(undefined, 's');
  omxplayer.info = writeStdin.bind(undefined, 'z');
  omxplayer.incSpeed = writeStdin.bind(undefined, '1');
  omxplayer.decSpeed = writeStdin.bind(undefined, '2');
  omxplayer.prevChapter = writeStdin.bind(undefined, 'i');
  omxplayer.nextChapter = writeStdin.bind(undefined, 'o');
  omxplayer.prevAudio = writeStdin.bind(undefined, 'j');
  omxplayer.nextAudio = writeStdin.bind(undefined, 'k');
  omxplayer.prevSubtitle = writeStdin.bind(undefined, 'n');
  omxplayer.nextSubtitle = writeStdin.bind(undefined, 'm');
  omxplayer.decSubDelay = writeStdin.bind(undefined, 'd');
  omxplayer.incSubDelay = writeStdin.bind(undefined, 'f');

  Object.defineProperty(omxplayer, 'running', {
    get(){ return open; },
  });

    // ----- Return Object ----- //

  return omxplayer;
}


module.exports = Omx;
