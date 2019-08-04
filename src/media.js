const getvideoduration = require('get-video-duration');
const fs = require('fs');
const util = require('./util');
const path = require('path');
const youtubedl = require('youtube-dl');
const Subtitle = require('subtitle');

const nutil = require('util');

/**
 *
 * @param url
 * @property {string} url
 * @property {string} filename
 * @property {string} ext
 * @property {string} name
 * @property {string} episode
 * @property {string} serie
 * @property {string} year
 * @property {string} quality
 * @property {string} format
 * @constructor
 */
function MediaModel(url){
  this.url = url || '';
  this.filename = path.posix.basename(url);
  this.ext = path.posix.extname(url);
  this.quality = '';
  this.format = '';
}

/**
 * @param {object} formats
 * @return {MediaModel|undefined}
 */
MediaModel.fromYTFormat = function(formats){
  let r = [];
  for (let i = 0, len = formats.length; i < len; i++) {
    const format = formats[i];
    let url = format.url;

    if (!url){
      console.error('cant create model');
      return;
    }

    let mediaModel = new MediaModel(url);

    // Override ext, FIXME-hacketo good idea ??
    mediaModel.ext = '.' + format.ext;
    mediaModel.format = format.format;
    mediaModel.quality = format.quality;
    r.push(mediaModel);
  }

  return r;

};


/**
 *
 * Class to handle a media
 *
 * @param {string} url - url to retrieve the media from
 *
 * @property {string} url - url of the media
 * @property {?number} duration - duration of the media in ms
 * @property {Array} subtitles - list of file available to usefor subtitles
 * @property {string} name - name of the media (human readable)
 * @property {string} filename - name of the media file
 * @property {string} episode - episode number if from a serie
 * @property {string} season - serie name
 * @property {string} serie - serie name
 * @property {string} year - year of production if any
 * @class
 * @constructor
 */
function Media(url){

  /**
   * contain the list of media files available
   * @type {Array<MediaModel>}
   * @protected
   */
  this.medias_ = [];

  /**
   * Main mediamodel for that media
   * @type {?MediaModel}
   * @protected
   */
  this.media_ = null;

  this.filename = null;
  this.duration = null;
  this.subtitles = [];

  this.name = null;

  this.episode = null;
  this.serie = null;
  this.year = null;

  this.setUrl_(url || '');

  this.extractMediaName(this.media_);
}

/**
 * @const
 * @type {boolean}
 */
Media.deleteVTT = true;
Media.tempDir = `${__dirname }/../temp/`;



/**
 * Update the url of the media, and the ext
 * @param {string} url
 * @protected
 */
Media.prototype.setUrl_ = function(url){
  if (typeof url !== 'string'){
    throw new Error('url should be a string');
  }

  if (url !== this.url) {
    this.url = url;
    this.media_ = new MediaModel(url);

    this.filename = this.media_.filename;
  }
};


const common_after_name = ['\\bFRENCH\\b', '\\b1080p\\b', '\\bVOSTFR\\b', '\\b720p\\b', '\\bMULTI\\b', '@', '\\bHDRip\\b', '\\bVFF\\b', '\\bHDLight\\b', '\\bFR\\b', '\\bEN\\b', '\\bBluRay\\b', '\\(', '\\['];
const FILENAME_ENDS_REG = new RegExp(common_after_name.join('|'), 'i');
const IS_EPISODE_REG = /S([0-9]{1,2}).{0,5}?E([0-9]{1,3})/i;
/**
 * Update current info about the main media
 * @param {MediaModel} mediaModel
 */
Media.prototype.extractMediaName = function(mediaModel){

  const fileName = mediaModel.filename;

  const match = IS_EPISODE_REG.exec(fileName);

  if (match){
    this.serie = +match[1] || 0;
    this.episode = +match[2] || 0;
  }

  let ext = path.posix.extname(fileName);

  const res = FILENAME_ENDS_REG.exec(fileName);

  const iof = res && res.index || fileName.length - ext.length;

  const filename_part = fileName.slice(0, iof);

  // split on one/many dots or one/many spaces
  const data = filename_part.split(/\.|\s+/);

  let iOfDate = data.length;

  // Check if name contains a date (not at start index) usually comes after the name
  data.forEach((word, index) => {
    if (index > 0 && +word === +word && word.length === 4){
      iOfDate = index;
      this.year = word;
      return false;
    }
  });
  // remove the date part of the name
  const mediaName = data.slice(0, iOfDate).join(' ');

  this.name = mediaName;
}

/**
 * Update the url of the media, and the ext
 * @private
 */
Media.prototype.resolveMedias = function(){
  if (!this.medias_.length){
    this.medias_[0] = this.media_;
  }
  return Promise.resolve(this.medias_);
};

/**
 * Mock for local video duration
 * Returns a promise that will be resolved with duration of given video, as a
 * float.
 *
 * @param  {Stream|String} input Stream or URL or path to file to be used as
 * input for ffprobe.
 *
 * @return {Promise} Promise that will be resolved with given video duration, as
 * a float.
 */
Media.prototype.getvideoduration__ = function(input){
  return getvideoduration.apply(getvideoduration, arguments);
};

/**
 * Try to resolve the duration for the media
 * @returns {Promise<number>|Promise<any | never>}
 */
Media.prototype.resolveDuration = function(){
  if (this.duration != null){
    return Promise.resolve(this.duration);
  }

  if (!this.url.length){
    return Promise.reject('no media url provided');
  }

  return this.getvideoduration__(this.url).then((duration) => {
    this.duration = duration;
    return this.duration;
    // if (this.checkSpawnID_(spawnID)){
    //     return Promise.reject("another spawn instance started");
    // }

    // this.spawnOk_(spawnID, media, duration, displayedUrl, subtitles);
  }, (error) => {
    util.error(this.url, error);
    this.duration = null;
    throw new Error(error);
  });
};




/**
 * Check if a file with the same name but SRT ext exists near by the media file
 * @param {string} preferedLang
 * @returns {Promise<Array<string>>}
 */
Media.prototype.resolveSubtitles = function(preferedLang){
  if (fs.existsSync(Media.tempDir + this.filename + SRT_EXT)){
    this.subtitles = [this.filename + SRT_EXT];
  }
  else {
    this.subtitles = [];
  }
  return Promise.resolve(this.subtitles);
};


Media.prototype.next = function(){
  return null;
};


Media.prototype.previous = function(){
  return null;
};


/**
 *
 * @param {string} url
 * @class
 * @extends Media
 * @constructor
 */
function WebMedia(url){
  Media.call(this, url);
}
nutil.inherits(WebMedia, Media);


/**
 * {@see youtubedl.getInfo}
 * Gets info from a video.
 *
 * @param {String} url
 * @param {Array.<String>} args
 * @param {Object} options
 * @param {function(!Error, Object)} cb
 */
WebMedia.prototype.getInfo__ = function(url, args, options, cb){
  return youtubedl.getInfo.apply(youtubedl, arguments);
};
/**
 * {@see youtubedl.getSubs}
 * @param {String} url
 * @param {Object} options
 *   {Boolean} auto
 *   {Boolean} all
 *   {String} lang
 *   {String} format
 *   {String} cwd
 * @param {function(!Error, Object)} cb
 */
WebMedia.prototype.getSubs__ = function(url, options, cb){
  return youtubedl.getSubs.apply(youtubedl, arguments);
};
/**
 * {@see youtubedl.exec}
 * Calls youtube-dl with some arguments and the `cb`
 * gets called with the output.
 *
 * @param {string} url
 * @param {Array.<String>} args
 * @param {Object} options
 * @param {function(!Error, string)} cb
 */
WebMedia.prototype.exec__ = function(url, args, options, cb){
  return youtubedl.exec.apply(youtubedl, arguments);
};

/**
 * Update the url of the media, and the ext
 * @param {string} url
 * @protected
 */
WebMedia.prototype.setUrl_ = function(url){
  Media.prototype.setUrl_.apply(this, arguments);
};

/**
 * Update the list of available media
 * @parem {Array<string>} formats_preference
 * @private
 */
WebMedia.prototype.resolveMedias = function(formats_preference){
  if (!this.medias_.length ){

    return new Promise((resolve, reject) => {
      //TODO-tt empty for regular quality
      const args = [];
      this.getInfo__(this.url, args, (err, info) => {

        if (err) {
          util.error(err);
          return reject(err);
        }

        // If another spawn was started, no need to do anything here ...
        // if (this.checkSpawnID_(spawnID)) {
        //     return;
        // }

        //util.debug(info);
        // Duration of the media in ms
        this.duration = info._duration_raw;

        this.filename = info._filename.slice(0, info._filename.length - info.ext.length - 1);

        //TODO convert to mediaModel
        this.medias_ = MediaModel.fromYTFormat(this.sortFormats_(formats_preference, info.formats, info.format));
        resolve(this.medias_);
      });
    }).then( () => {
      if (this.medias_.length > 0){
        this.media_ = this.medias_[0];
        this.extractMediaName(this.media_);
      }
    });
  }
  return Promise.resolve(this.medias_);
};

const EXT_PREF = [
  'mp4',
];

/**
 *
 * @param {Array<string>} formats_preference
 * @param {Array<object>} formats
 * @param {string} mainFormat
 * @returns {Array}
 */
WebMedia.prototype.sortFormats_ = function(formats_preference, formats, mainFormat){

  const pref = formats_preference.slice();
  if (!pref.includes(mainFormat)) {
    pref.push(mainFormat);
  }

  const formatList = [];

  formats.forEach(format => {
    const iOf = pref.indexOf(format.format);
    if (iOf > 0){
      format.__cValue = iOf;
      formatList.push(format);
    }
  });

  formatList.sort((f1, f2) => {
    return f1.__cValue - f2.__cValue;
  });

  return formatList;
};

/**
 *
 *
 * @param {Array<string>} formats_preference
 * @param {Array<object>} formats
 * @param {string} mainFormat
 * @returns {Array}
 */
WebMedia.prototype.toMediaModels_ = function(formatList){
  let r = []
  for (let i = 0, len = formatList.length; i < len; i++) {
    r.push(new MediaModel(formatList.url, ))
  }



};

/**
 * Try to resolve the duration for the media
 * @returns {Promise<number>|Promise<any | never>}
 */
WebMedia.prototype.resolveDuration = function(){
  if (this.duration != null){
    return Promise.resolve(this.duration);
  }

  if (!this.url.length){
    return Promise.reject('no media url provided');
  }

  return new Promise((resolve, reject) => {
        //TODO-tt empty for regular quality
    const args = [];
    this.getInfo__(media, args, (err, info) => {

      if (err) {
        util.error(err);
      }

      // If another spawn was started, no need to do anything here ...
      if (this.checkSpawnID_(spawnID)) {
        return;
      }

      if (!err) {
      //util.debug(info);

        this.media = info.url;

        // Duration of the media in ms
        this.duration = info._duration_raw;
      }
    });
  });
};

const SRT_EXT = '.srt';

/**
 * Check if a file with the same name but SRT ext exists near by the media file
 * @param {string} preferedLang
 * @returns {Promise<Array<string>>}
 */
WebMedia.prototype.resolveSubtitles = function(preferedLang){

  const tempDir = Media.tempDir;

  if (fs.existsSync(tempDir + this.filename + preferedLang + SRT_EXT)){
    this.subtitles = [this.filename + preferedLang + SRT_EXT];
    return Promise.resolve(this.subtitles);
  }

  return this.listAvailableSubtitles(preferedLang).then((data) => {

    return new Promise((resolve, reject) => {

      const dlSubs = !!data.subtitles.length || !!data.auto.length;

      if (dlSubs) {
        const auto = !data.subtitles.length;

        const options = {
          // Write automatic subtitle file (youtube only)
          auto: auto,
          // Downloads all the available subtitles.
          all: false,
          // Subtitle format. YouTube generated subtitles
          // are available ttml or vtt.
          format: 'srt',
          // Languages of subtitles to download, separated by commas.
          lang: auto && data.auto[0] || data.subtitles[0],
          // The directory to save the downloaded files in.
          cwd: tempDir,
        };

        this.getSubs__(this.url, options, (err, files) => {
          if (err) {
            util.error(err);
            util.deleteFiles(tempDir, files);
            return reject(err);
          }

          // In case we have at least one subtitle in the 'files' list
          if (files && typeof files[0] === 'string') {

            util.debug('Downloaded sutitles : ', files);

            const subtitleFile = `${tempDir }${ files[0]}`;

            // Start handling the downloaded file (format conversion ..)

            resolve(this.handleSubtitles(subtitleFile).then((subtitleFile) => {

              // Delete any other downloaded files that we don't need to use for the media
              if (Media.deleteVTT) {
                util.deleteFiles(tempDir, files, [subtitleFile]);
              }
              return subtitleFile;
            }).catch(reason => {
              util.deleteFiles(tempDir, files);
            }));
          }

          // no subtitles
          resolve([]);
        });
        return;
      }

      // No subs available
      resolve([]);
    });
  });
};

/**
 * @param {string} preferedLang
 * @returns {Promise<Array<Array<string>>>}
 */
WebMedia.prototype.listAvailableSubtitles = function(preferedLang){

  return new Promise((resolve, reject) => {

    this.exec__(this.url, ['--list-subs'], {}, (err, output) => {
      if (err) {
        reject(err);
        return;
      }
            // console.log(output.join('\n'));

      const rValue = {
        auto: [],
        subtitles: [],
      };

      let state = 0;
      output.forEach(line => {
        if (line){
          if (line.startsWith('Available automatic captions')){
            state = 1;
          }
          if (line.startsWith('Available subtitles')){
            state = 2;
          }
          if (state === 1){
            if (line.startsWith(preferedLang)){
              if (line.indexOf('vtt') > -1){
                rValue.auto.push(preferedLang);
              }
            }
          }
          if (state === 2){
            if (line.startsWith(preferedLang)){
              if (line.indexOf('vtt') > -1){
                rValue.subtitles.push(preferedLang);
              }
            }
          }
        }
      });
      resolve(rValue);
    });
  });
};

const VTT_EXT = '.vtt';

/**
 *
 * @param {string} subtitleFile
 * @returns {Promise<void|string>}
 */
WebMedia.prototype.handleSubtitles = function(subtitleFile){

  return this.convertSubtitleFileIfNeeded__(subtitleFile)
  .then(subtitleFile => {

    if (subtitleFile) {
      if (!subtitleFile.endsWith(SRT_EXT)) {
        if (Media.deleteVTT) {
          util.deleteFile(subtitleFile);
        }
        subtitleFile = null;
      }
    }

    if (subtitleFile) {
      util.log(`SUBTITLES: ${ subtitleFile}`);
      this.subtitles.push(subtitleFile);
    }

    return subtitleFile;
  });
};

/**
 *
 * @param {string} subtitleFile
 * @returns {Promise<void|string>}
 */
WebMedia.prototype.convertSubtitleFileIfNeeded__ = function(subtitleFile){

  return new Promise( (resolve, reject) => {

    util.debug(`Subtitles ${subtitleFile}`);

    if (subtitleFile.endsWith(VTT_EXT)) {
      const originalFile = subtitleFile;
      const srtFile = originalFile.slice(0, originalFile.length - VTT_EXT.length) + SRT_EXT;

      // Will use already cached file
      if (fs.existsSync(srtFile)) {
        if (Media.deleteVTT) {
          util.deleteFile(originalFile);
        }

        subtitleFile = srtFile;
        return resolve(srtFile);
      }
      else {
        fs.readFile(originalFile, 'utf8', (err, data) => {
          if (Media.deleteVTT) {
            util.deleteFile(originalFile);
          }

          if (err) {
            util.error(err);

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

              resolve(rValue);
            });
          }
        });
      }
      return;
    }

    // Here subtitleFile will not have a valid format and will be deleted after if not already
    resolve(subtitleFile);
  })
};

WebMedia.prototype.next = function(){
  return null;
};


WebMedia.prototype.previous = function(){
  return null;
};




module.exports.MediaModel = MediaModel;
module.exports.Media = Media;
module.exports.WebMedia = WebMedia;
