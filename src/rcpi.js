/**
 * Created by hacketo on 25/05/18.
 */

const fs = require('fs');
const util = require('./util');
const youtubedl = require('youtube-dl');
const getvideoduration = require('get-video-duration');
const UDPServer = require('./udp').UDPServer;
const WSServer = require('./websockets').WSServer;
const KEYS = require('./keys').KEYS;
const Clients = require('./clients').Clients;
const exec = require('child_process').exec;
const Subtitle = require('subtitle');

const wget = require('./wget').wget;

let Omx = require('./mock.js');

exec('command -v omxplayer', function(err, stdout) {
  if (err || stdout.length === 0) {
    util.log('/!\\ MOCK : OMX NOT INSTALLED /!\\');
  }
  else {
    Omx = require('node-omxplayer');
  }
});

/**
 * @name RCPI
 * @class
 * @param {object} config
 * @constructor
 */
function RCPI(config){

  config = Object.assign({
    use_ws: false,
    udp_port: 9878,
    ws_port: 9877,
    mediaDirs: ['/media/pi', '/home/pi/Videos'],
    downloadDir: '/home/pi/Videos',
    tempDir: `${__dirname}/../temp`,
    subMaxChar: 50,
  }, config);

  this.mediaDirs = config.mediaDirs;
  this.downloadDir = config.downloadDir;
  this.tempDir = config.tempDir;
  this.subtitlesMaxChar = config.subMaxChar;

  this.subtitlesEnabled = false;
    /**
     *
     * @type {EventEmitter}
     */
  this.omx_player = null;
  this.udpServer = null;
  this.wsServer = null;

  this.mediaPath = '';
  this.volume = -600;

  /**
   * Time in milliseconds
   * @type {number}
   * @private
   */
  this.currentMediaDuration_ = -1;

  /**
   * Time in milliseconds
   * @type {number}
   * @private
   */
  this.currentMediaCursor_ = 0;
  /**
   * Time in milliseconds
   * @type {number}
   * @private
   */
  this.lastCheck_ = 0;
  this.isMediaPlaying = false;

  this.use_ws = config.use_ws;
  this.udp_port = config.udp_port;
  this.ws_port = config.ws_port;

  /**
   * true if a client asked the omx player to close
   * @type {boolean}
   */
  this.asked_close = false;

  /**
   * Liste of media availables
   * @type {Array<string>}
   */
  this.mList = [];
  this.mediaEnded = false;

  /**
   *
   * @type {Clients}
   */
  this.clients = null;

  this.spawn_id = 0;

  this.histo = [];
}

/**
 * Init and starts sockets listeners
 */
RCPI.prototype.init = function(){

  this.clients = new Clients();

  this.udpServer = new UDPServer(this.clients, this.udp_port);
  this.udpServer.init(this);
  if (this.use_ws){
    this.wsServer = new WSServer(this.clients, this.ws_port);
    this.wsServer.init(this);
  }

  this.get_available_media();
};

RCPI.prototype.onPING = function(client){
  this.updateMediaCursor();
  client.send(KEYS.FINFOS, this.get_play_packet());
};


RCPI.prototype.onLIST = function(client){
  client.send(KEYS.LIST, this.get_available_media());
};


RCPI.prototype.onOPEN = function(client, path, ask_subtitles){
  if (!path){
    util.log('no path specified');
    return;
  }
  this.spawn_omxplayer(path, ask_subtitles);
};


RCPI.prototype.onDOWNLOAD = function(client, path){
  if (!path){
    util.log('no path specified');
    return;
  }

  this.download(client, path);
};


RCPI.prototype.onDEBUG = function(client, cmd){
  if (!cmd){
    util.log('no cmd specified');
    return;
  }

  if (cmd === 'sub'){
    if (this.sub_debug(client)){

    }
    else {

    }
  }

  if (cmd === 'unsub'){
    if (this.unsub_debug(client)){

    }
    else {

    }
  }
};

/**
 * Browse this.mediaDirs to get a list of media
 * @return {*}
 */
RCPI.prototype.get_available_media = function(){
  let l = [];
  this.mediaDirs.forEach(function(i){
    try {
      if (fs.existsSync(i)) {
        l = l.concat(util.walk(i));
      }
    } catch (e){

    }
  });
  if (l.length > 0){
    this.mList = l;
    return l;
  }
  return RCPI.MOCK_MEDIALIST;
};
RCPI.MOCK_MEDIALIST = ['/a', '/b'];

const VTT_EXT = '.vtt';
const SRT_EXT = '.srt';

/**
 *
 * @param {string} media - url of the media file used for the omx instance source
 * @param {boolean|number|undefined} ask_subtitles
 */
RCPI.prototype.spawn_omxplayer = function(media, ask_subtitles){

  // Increment spawn id counter
  const spawnID = ++this.spawn_id;

  // reset flag
  this.asked_close = false;

  this.subtitlesEnabled = typeof ask_subtitles === 'undefined' ? true : !!ask_subtitles;

  if (media === 'H'){
    if (this.histo.length){
      media = this.histo[0].url;
    }
  }

  // If media starts with / we assume that it's a local path, will be handled by getmediaduration
  if (media.indexOf('youtube.') === -1 && media.indexOf('youtu.be') === -1){
    this.spawn_(spawnID, media);
  }

  // Handle Youtube Web urls
  else {
    //TODO-tt empty for regular quality
    const args = [];
    youtubedl.getInfo(media, args, (err, info) => {

      if (err) {
        util.error(err);
      }

            // If another spawn was started, no need to do anything here ...
      if (this.checkSpawnID_(spawnID)) {
        return;
      }

      if (!err) {
                //util.debug(info);

        const url = info.url;

                // Duration of the media in ms
        const duration = info._duration_raw;

                // Only handle subtitles for youtube videos
        if (!this.subtitlesEnabled || info.extractor !== 'youtube') {
          return this.spawn_(spawnID, url, duration);
        }


                // Check for a possible cached subtitles file
        if (typeof info._filename === 'string') {
          const subtitleFile = this.computeSrtFilepath_(info, 'fr');

          if (fs.existsSync(subtitleFile)) {
            util.debug(`file already exists : using ${ subtitleFile}`);
            return this.spawn_(spawnID, url, duration, media, subtitleFile);
          }
        }

        util.debug('Try downloading subtitles ');

        const options = {
                    // Write automatic subtitle file (youtube only)
          auto: true,
                    // Downloads all the available subtitles.
          all: false,
                    // Subtitle format. YouTube generated subtitles
                    // are available ttml or vtt.
          format: 'srt',
                    // Languages of subtitles to download, separated by commas.
          lang: 'fr',
                    // The directory to save the downloaded files in.
          cwd: this.tempDir,
        };

        youtubedl.getSubs(media, options, (err, files) => {
          if (err) {
            util.error(err);
          }

                    // If not same spawnID we want to delete any files we could have downloaded
          if (this.checkSpawnID_(spawnID)) {
            this.deleteFiles_(files);
            return;
          }

          if (!err) {
                        // In case we have at least one subtitle in the 'files' list
            if (files && typeof files[0] === 'string') {

              util.debug('Downloaded sutitles : ', files);

              const subtitleFile = `${this.tempDir }/${ files[0]}`;

                            // Start handling the downloaded file (format conversion ..)
              this.handleSubtitles(subtitleFile, spawnID).then((subtitleFile) => {

                if (this.checkSpawnID_(spawnID)) {
                  return Promise.reject();
                }

                                // Delete any other downloaded files that we don't need to use for the media
                this.deleteFiles_(files, [subtitleFile]);
                this.spawn_(spawnID, url, duration, media, subtitleFile);
              }).catch(reason => {
                this.deleteFiles_(files);
              });
              return;
            }
          }

          this.deleteFiles_(files);
          this.spawn_(spawnID, url, duration, media);

        });
      }
    });
  }
};

/**
 * Delete a set of files that are not in the excepts list
 * @param {Array<string>} files - files path
 * @param {Array<string>=} excepts - list of files to exclude from the file list
 * @private
 */
RCPI.prototype.deleteFiles_ = function(files, excepts){
  excepts = excepts || [];
  if (Array.isArray(files)){
    files.forEach(file => {
      if (file){
        file = `${this.tempDir }/${ file}`;
        if (!excepts.includes(file)){
          util.deleteFile(file);
        }
      }
    });
  }
};


/**
 *
 * @param {{_filename:string, ext:string}} info
 * @param {string} language
 * @return {string}
 * @private
 */
RCPI.prototype.computeSrtFilepath_ = function(info, language){
  return `${this.tempDir }/${ info._filename.slice(0, info._filename.length - info.ext.length - 1) }.${ language }${SRT_EXT}`;
};

/**
 * Check is the spawnID parameter id the same as the one stored on the RCPI instance.
 * If different it means that another spawn was called
 * @param spawnID
 * @return {boolean}
 * @private
 */
RCPI.prototype.checkSpawnID_ = function(spawnID){
  return spawnID !== this.spawn_id;
};


/**
 *
 * @param {string} subtitleFile
 * @param {number} spawnID
 * @return {Promise<void|string>}
 */
RCPI.prototype.handleSubtitles = function(subtitleFile, spawnID){

  return new Promise((resolve, reject) => {

    if (this.checkSpawnID_(spawnID)){
      return reject();
    }

    util.debug(`Subtitles ${subtitleFile}`);

    if (subtitleFile.endsWith(VTT_EXT)) {
      const originalFile = subtitleFile;
      const srtFile = originalFile.slice(0, originalFile.length - VTT_EXT.length) + SRT_EXT;

            // Will use already cached file
      if (fs.existsSync(srtFile)) {
        util.deleteFile(originalFile);
        subtitleFile = srtFile;
        resolve(srtFile);
      }
      else {
        fs.readFile(originalFile, 'utf8', (err, data) => {
          util.deleteFile(originalFile);

          if (err) {
            util.error(err);
          }

          if (this.checkSpawnID_(spawnID)){
            return reject();
          }

          if (err) {
                        // Here originalFile will not have a valid format and will be deleted after if not already
            resolve(originalFile);
          }
          else {

            const subData = Subtitle.parse(data);

            if (data.indexOf('<00:') === -1) {

              subData.forEach(line => {
                if (line.text && line.text.length > this.subtitlesMaxChar) {
                  line.text = util.subtitleMaxLineLength(line.text, this.subtitlesMaxChar);
                }
              });

            }

            const srtdata = Subtitle.stringify(subData);

            fs.writeFile(srtFile, srtdata, (err) => {
              let rValue;
              if (err) {
                util.error(err);
                util.deleteFile(srtFile);
              }
              else {
                util.debug(`The file has been saved! : ${srtFile}`);
                rValue = srtFile;
              }

              if (this.checkSpawnID_(spawnID)){
                return reject();
              }

              resolve(rValue);
            });
          }
        });
      }
    }
    else {
            // Here subtitleFile will not have a valid format and will be deleted after if not already
      resolve(subtitleFile);
    }
  })
    .then(subtitleFile => {

      if (this.checkSpawnID_(spawnID)){
        return Promise.reject();
      }

      if (subtitleFile) {
        if (!subtitleFile.endsWith(SRT_EXT)) {
          util.deleteFile(subtitleFile);
          subtitleFile = null;
        }
      }

      if (subtitleFile) {
        util.log(`SUBTITLES: ${ subtitleFile}`);
      }

      return subtitleFile;
    });
};

/**
 * Ensure that we have duration info about the media, then will call the @link {#spawnOk_} method
 * @param {number} spawnID -
 * @param {string} media - url of the media file used for the omx instance source
 * @param {number=} duration - duration of the media in seconds
 * @param {string=} displayedUrl - url used to display a different url than the actual video file
 * @param {string=} subtitles - path of the file to use as subtitles for the media
 * @private
 */
RCPI.prototype.spawn_ = function(spawnID, media, duration, displayedUrl, subtitles){
  if (RCPI.MOCK_MEDIALIST.indexOf(media) > -1){
    duration = 10000;
  }

  if (typeof duration !== 'undefined'){
    this.spawnOk_(spawnID, media, duration, displayedUrl, subtitles);
    return;
  }

  getvideoduration(media).then((duration) => {

    if (this.checkSpawnID_(spawnID)){
      return Promise.reject('another spawn instance started');
    }

    this.spawnOk_(spawnID, media, duration, displayedUrl, subtitles);
  }, (error) => {
    util.error(media, error);
  });
};

/**
 * Spawn a new instance of Omx/resuse one, play the media with optional subtitles
 * @param {number} spawnID -
 * @param {string} media - url of the media
 * @param {int|float} duration - duration of the media in seconds
 * @param {string=} displayedUrl - path of the file to use as subtitles for the media
 * @param {string=} subtitles - path of the file to use as subtitles for the media
 * @private
 */
RCPI.prototype.spawnOk_ = function(spawnID, media, duration, displayedUrl, subtitles){

  if (this.checkSpawnID_(spawnID)){
    return;
  }

  displayedUrl = displayedUrl || media;

  util.log(`lancement ${displayedUrl} durée ${duration}`);

  this.currentMediaDuration_ = Math.round(duration * 1000);

  const custom_omx_args = [];

  if (subtitles) {
    custom_omx_args.push('--align', 'center', '--subtitles', subtitles);
    this.subtitlesEnabled = true;
  }
  else {
    this.subtitlesEnabled = false;
  }

  let cursorTime = 0;

  if (this.histo.length){
    if (this.histo[0].url === displayedUrl){
      custom_omx_args.push('--pos', util.getOmxTime(this.histo[0].time));
      cursorTime = this.histo[0].time || 0;
    }
  }
  this.histo[0] = {
    url: displayedUrl,
  };

    // If omx was never initialized create new instance and setup listeners
  if (this.omx_player == null){
    this.omx_player = Omx(media, 'hdmi', false, this.volume, false, custom_omx_args);

    this.omx_player.on('error', msg => {
      util.error('error', msg);
      this.clients.timeout_duration = 240000;
    });

    this.omx_player.on('close', code => {
      util.log('closed', code);

      if (!this.asked_close && this.isMediaPlaying && this.histo[0]) {
        this.histo[0].time = this.currentMediaCursor_;
      }

      this.isMediaPlaying = false;

      if (!this.asked_close){
        const i = this.mList.indexOf(this.mediaPath);
        if (i > -1 && this.mList[i + 1]){
          if (getFilmName(this.mList[i + 1]).startsWith(getFilmName(this.mediaPath).substr(0, 8))){
            this.spawn_omxplayer(this.mList[i + 1], this.subtitlesEnabled);
            return;
          }
        }
      }
      this.subtitlesEnabled = false;
    });
  }
  else {
    this.omx_player.newSource(media, 'hdmi', false, this.volume, false, custom_omx_args);
  }

    // New media should be spawning now, so we might want to update the timeout duration for the connected clients
    // It should be duration of the media + 5 min or 10 min ?
  this.clients.update_timeout(this.currentMediaDuration_);

  this.mediaPath = displayedUrl;
  this.resetMediaCursor(cursorTime);
  this.sendInfos();
};


RCPI.prototype.send_to_omx = function(client, key){
  if (this.omx_player != null && this.omx_player.running){
    switch (key){
      case KEYS.PLAY:
        this.playPauseCursor();
        this.omx_player.play();
        this.sendInfos(client);
        break;
      case KEYS.PLAYBACK_BACKWARD600:
        this.updateMediaCursor();
        this.moveCursor(util.sec(-600));
        this.omx_player.back600();
        this.sendCursorInfos(client);
        break;
      case KEYS.PLAYBACK_BACKWARD30:
        this.updateMediaCursor();
        this.moveCursor(util.sec(-30));
        this.omx_player.back30();
        this.sendCursorInfos(client);
        break;
      case KEYS.PLAYBACK_FORWARD30:
        this.updateMediaCursor();
        this.moveCursor(util.sec(30));
        this.omx_player.fwd30();
        this.sendCursorInfos(client);
        break;
      case KEYS.PLAYBACK_FORWARD600:
        this.updateMediaCursor();
        this.moveCursor(util.sec(600));
        this.omx_player.fwd600();
        this.sendCursorInfos(client);
        break;
      case KEYS.AUDIO_TRACK_NEXT:
        this.omx_player.nextAudio();
        break;
      case KEYS.AUDIO_TRACK_PREV:
        this.omx_player.prevAudio();
        break;
      case KEYS.AUDIO_VOL_UP:
        this.volume += 100;
        this.omx_player.volUp();
        break;
      case KEYS.AUDIO_VOL_DOWN:
        this.volume -= 100;
        this.omx_player.volDown();
        break;
      case KEYS.SUBTITLE_TOGGLE:
        this.subtitlesEnabled = !this.subtitlesEnabled;
        this.omx_player.subtitles();
        break;
      case KEYS.SUBTITLE_TRACK_NEXT:
        this.omx_player.nextSubtitle();
        break;
      case KEYS.SUBTITLE_TRACK_PREV:
        this.omx_player.prevSubtitle();
        break;
      case KEYS.SUBTITLE_DELAY_DEC:
        this.omx_player.decSubDelay();
        break;
      case KEYS.SUBTITLE_DELAY_INC:
        this.omx_player.incSubDelay();
        break;
      case KEYS.QUIT:
        this.asked_close = true;

        this.histo[0].time = this.currentMediaCursor_;

        this.omx_player.quit();
        this.isMediaPlaying = false;
        break;
      case KEYS.INFOS:
        this.omx_player.info();
        break;
      default:
        util.log(`key not found ${key}`);
        break;
    }
  }
};

RCPI.prototype.get_play_packet = function(){
  return [
    this.currentMediaCursor_,
    this.isMediaPlaying,
    this.currentMediaDuration_,
    this.mediaPath,
    this.subtitlesEnabled,
  ];
};
RCPI.prototype.get_cursor_packet = function(){
  return [
    this.currentMediaCursor_,
    this.subtitlesEnabled,
  ];
};

/**
 *
 * @param {ProgressDl} dlObj
 * @returns {*[]}
 */
RCPI.prototype.get_dl_packet = function(dlObj){
  return [
    dlObj.name, dlObj.length,
    dlObj.progress.progress, dlObj.progress.speed,
    dlObj.progress.remaining, dlObj.progress.size,
  ];
};

/**
 *
 * @param {Client} client
 * @param {ProgressDl} dlObj
 */
RCPI.prototype.sendDownloadInfo = function(client, dlObj){
  client.send(KEYS.DL, this.get_dl_packet(dlObj));
  this.clients.update_timeout(this.isMediaPlaying ? (this.currentMediaDuration_ - this.currentMediaCursor_) : 0);
};
RCPI.prototype.sendInfos = function(){
  this.broadcast(KEYS.FINFOS, this.get_play_packet());
  this.clients.update_timeout(this.isMediaPlaying ? (this.currentMediaDuration_ - this.currentMediaCursor_) : 0);
};
RCPI.prototype.sendCursorInfos = function(){
  this.broadcast(KEYS.FINFOS, this.get_cursor_packet());
  this.clients.update_timeout(this.isMediaPlaying ? (this.currentMediaDuration_ - this.currentMediaCursor_) : 0);
};

RCPI.prototype.broadcast = function(action, data){
  this.clients.broadcast(action, data);
};

RCPI.prototype.resetMediaCursor = function(cursorTime){
  this.currentMediaCursor_ = cursorTime || 0;
  this.isMediaPlaying = true;
  this.lastCheck_ = +new Date();
};
RCPI.prototype.playPauseCursor = function(){
  this.updateMediaCursor();
  this.isMediaPlaying = !this.isMediaPlaying;

};
RCPI.prototype.updateMediaCursor = function(){
  if (this.isMediaPlaying) {
    this.moveCursor(+new Date() - this.lastCheck_);
  }
  this.lastCheck_ = +new Date();
};

RCPI.prototype.moveCursor = function(d){
  if (this.currentMediaCursor_ + d > this.currentMediaDuration_){
    this.currentMediaCursor_ = this.currentMediaDuration_;
    this.mediaEnded = true;
  }
  else if (this.currentMediaCursor_ + d < 0){
    this.currentMediaCursor_ = 0;
  }
  else {
    this.currentMediaCursor_ = this.currentMediaCursor_ + d;
  }
};

RCPI.prototype.clean_exit = function(){
  if (this.omx_player != null){
    this.omx_player.quit();
  }
  if (this.wsServer !== null) {
    this.wsServer.close(function() {
      util.log('WSServer closed!');
      process.exit(); // should call exitHandler with cleanup
    });
  }
  if (this.udpServer !== null) {
    this.udpServer.close(function() {
      util.log('UDPServer closed!');
    });
  }
};

RCPI.prototype.download = function(client, url){
  const mediaUrl = url;
  const output = this.downloadDir;

  let download = wget(mediaUrl, output);
  download.on('error', function(err) {
    util.error(err);
  });
  download.on('close', function(output) {
    util.log(output);
  });


  download.on('progress', /** @param {ProgressDl} dlObj*/ dlObj => {
    console.log('send progress !!!');
    this.sendDownloadInfo(client, dlObj);
  });
};

RCPI.prototype.sub_debug = function(client){
  if (this.subs.indexOf(client) === -1){
    this.subs.push(client);
    return true;
  }
  return false;
};

RCPI.prototype.unsub_debug = function(client){
  const iof = this.subs.indexOf(client);
  if (iof > -1){
    this.subs.splice(iof, 1);
    return true;
  }
  return false;
};


function getFilmName(path){
  const a = path.split('/');
  return a[a.length - 1];
}

module.exports.RCPI = RCPI;
module.exports.KEYS = KEYS;
