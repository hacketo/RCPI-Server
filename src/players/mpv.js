/**
 * Created by hacketo on 09/05/18.
 */

const EventEmitter = require('events');
const mpv = require('node-mpv');
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
function Mpv(source, output, loop, initialVolume, showOsd, customArgs){


  let player = {};

  const mpvplayer = new EventEmitter();
  let open = false;

  // Spawns the mpvplayerplayer process.
  function spawnPlayer(src, out, loop, initialVolume, showOsd, customArgs) {
    // https://www.npmjs.com/package/node-mpv
    if (!player.load){
      player = new mpv({
          audio_only: false,
          binary: null,
          debug: false,
          ipcCommand: null,
          socket: '/tmp/node-mpv.sock', // UNIX
          time_update: 1,
          verbose: false,
        },
        [
          '--fullscreen',
          '--fps=60',
        ]);
    }

    player.load(source);
    player.volume((initialVolume + 1000) / 2000 * 100);

    if (customArgs.includes('--pos')){
      const iof = customArgs.indexOf('--pos');
      const pos = customArgs[iof + 1];

      player.goToPosition(pos);
    }

    console.log('MOCK OMX : args for mpvplayerplayer:', src, out, loop, initialVolume, showOsd, customArgs);
    open = true;
  }

  // ----- Setup ----- //
  if (source) {
    spawnPlayer(source, output, loop, initialVolume, showOsd, customArgs);
  }

  // ----- Methods ----- //
  /**
   *
   * Restarts mpvplayerplayer with a new source.
   * @param {string} src
   * @param {string} out - 'hdmi', 'local', 'both', 'alsa'
   * @param {boolean=} loop
   * @param {number=} initialVolume
   * @param {boolean=} showOsd
   * @param {Array=} customArgs
   */
  mpvplayer.newSource = function(src, out, loop, initialVolume, showOsd, customArgs) {
      spawnPlayer(src, out, loop, initialVolume, showOsd, customArgs);
  };

  mpvplayer.play = function(playing){
    if (playing){
      player.play();
    } else {
      player.pause();
    }
  };
  mpvplayer.pause = function(){ player.pause(); };
  mpvplayer.volUp = function(){ player.adjustVolume(+10); };
  mpvplayer.volDown = function(){ player.adjustVolume(-10); };
  mpvplayer.fastFwd = function(){ console.log('>'); };
  mpvplayer.rewind = function(){ console.log('<'); };
  mpvplayer.fwd30 = function(){ player.seek(30); };
  mpvplayer.back30 = function(){ player.seek(-30); };
  mpvplayer.fwd600 = function(){ player.seek(600);};
  mpvplayer.back600 = function(){ player.seek(-600); };
  mpvplayer.quit = function(){ mpv.quit(); };
  mpvplayer.subtitles = function(){ player.toggleSubtitleVisibility(); };
  mpvplayer.info = function(){ player.command("show-progress")};
  mpvplayer.incSpeed = function(){ player.adjustAudioTiming(0.1); };
  mpvplayer.decSpeed = function(){ player.adjustAudioTiming(-0.1); };
  mpvplayer.prevChapter = function(){ console.log('i'); };
  mpvplayer.nextChapter = function(){ console.log('o'); };
  mpvplayer.prevAudio = function(){ player.cycleAudioTracks(); };
  mpvplayer.nextAudio = function(){ player.cycleAudioTracks(); };
  mpvplayer.prevSubtitle = function(){ player.cycleSubtitles(); };
  mpvplayer.nextSubtitle = function(){ player.cycleSubtitles(); };
  mpvplayer.decSubDelay = function(){ player.adjustSubtitleTiming(-0.5); };
  mpvplayer.incSubDelay = function(){ player.adjustSubtitleTiming(+0.5); };

  Object.defineProperty(mpvplayer, 'running', {
    get(){ return open; },
  });

  return mpvplayer;
}


module.exports = Mpv;
