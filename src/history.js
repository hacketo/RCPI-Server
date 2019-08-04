const fs = require('fs');
const util = require('./util');

/**
 *
 * Use a csv file to store a list of media played
 * The model used to store the data is a {@see MediaHisto}
 *
 * If a media is played multiple times will update the list of dates
 * Displayed url is used for the {MediaHisto.url} field
 * The media name shall be computed to a human readable format as so
 * "Actual film name"
 * "Episode name S01E05"
 * Every part containing metadata info should be removed as
 * 1080p, VOSTFR, bluray, ...
 *
 * @TODO-hacketo Well we need to find a reliable way to save data
 *
 * @param {string} filePath - path of the CSV file to use to store the data
 * @class
 *
 * @constructor
 */
function History(filePath){

  /**
   * path of the CSV file to use to store the data
   * @type {string}
   * @private
   */
  this.filePath_ = filePath;

  /**
   * actual data of the history
   * @type {Array<MediaHisto>}
   * @private
   */
  this.history_ = [];

  /**
   * Flag to ensure that we loaded the existing data
   * @type {boolean}
   * @private
   */
  this.loaded_ = false;

  /**
   * Store the last time the list of media was updated
   * The first time we store the list it should be equal to the
   * file's last modification time
   * @type {number}
   * @private
   */
  this.lastModificationTime_ = 0;
}

/**
 * Add a new Media history_ to the list, if url already exists,
 * will add a date and update the cursorPosition
 * @param {string} url - url of the media
 * @param {string} name - human readable name of the media
 * @param {Date} date - date of the 'playing'
 * @param {number} time - cursor position of the last time played
 */
History.prototype.add = function(url, name, date, time){
  let media = this.history_.find(m => m.url === url);

  if (!media){
    media = this.getNewModel_(url, name);
    this.history_.push(media);
  }
  media.dates.push(date);
  media.time = time;

  return media;
};

History.prototype.getNewModel_ = function(url, name, date, time){
  return new MediaHisto(url, name, date, time);
};

History.prototype.load = function(){
  return new Promise((resolve, reject) => {

    fs.readFile(this.filePath_, 'utf8', (err, data) => {
      if (err) {
        util.error(err);
        reject(err);
      }
      else {
        resolve(data);
      }
    });
  }).then(historyData => {

    const stats = fs.statSync(this.filePath_);

    // Retrieve file last modification time timestamp
    const lmt = +stats.mtime;

    // If history was never loaded ?
    let historyData = this.parse_(historyData);

    if (lmt !== this.lastModificationTime_){

      this.merge_(historyData, lmt);
    }

    // Update last modification time
    this.lastModificationTime_ = lmt;

    return this.history_;
  });
};

History.prototype.parse_ = function(data){

  function pasteDates(datesStr){
    const dates = datesStr.split(',');
    return dates.map(date => new Date(date || 0));
  }

  if (!data.length){
    return [];
  }

  const dataLines = data.split('\n');

  const history = [];

  dataLines.forEach(line => {
    const mediaData = line.split(';');
    const media = new MediaHisto(mediaData[0] || '', mediaData[1] || '', pasteDates(mediaData[2] || ''), mediaData[3] || 0);
    history.push(media);
  });

  return history;
};

/**
 *
 * @param {Array<MediaHisto>} histo - list of histo from file
 * @param {number} lmt - file last modification time
 * @private
 */
History.prototype.merge_ = function(histo, lmt){

  // Need to save current data
  if (this.history_.length > 0){

  }

  // need merge
  if (this.history_.length > 0){
    this.merge_(historyData);
  }

};

History.prototype.save = function(){
  return new Promise((resolve, reject) => {

    const csv = this.history_.join('\n');

    fs.writeFile(this.filePath_, csv, (err) => {

      if (err) {
        util.error(err);
        reject(err);
      }
      else {
        resolve();
      }
    });

  });
};

function MediaHistoList(){

  this.history_ = [];

  this.mediaUrlToId = {};

  /**
   * Store the last time the list of media was updated
   * The first time we store the list it should be equal to the
   * file's last modification time
   * @type {number}
   * @private
   */
  this.lastModificationTime_ = 0;
}

/**
 * Add a media to the history
 * if url already exists, update existing media history
 * @param {MediaHisto} media
 */
MediaHistoList.prototype.add = function(media){

  let mediaData;
  if (this.mediaUrlToId[media.url] != null){
    mediaData = this.mediaUrlToId[media.url];
  }

  if (!mediaData){
    this.mediaUrlToId[media.url] = media;
    this.history_.push(media);
  }
  // Add dates, remove duplicates
  mediaData.dates = [...new Set([mediaData.dates.concat(media.dates)])];

  //update cursorPosition
  mediaData.time = media.time;
};

/**
 *
 * @param {Array<MediaHisto>} mediaList
 */
MediaHistoList.prototype.merge = function(mediaList, lmt){

};






/**
 *
 * @param {string} url - url of the media (displayed)
 * @param {string} name - name of the media
 * @param {Date} date - date when the media was last played
 * @param {number} time - cursor time
 *
 * @property {string} url - url used to get the media from, should be
 * the display one to have better chance to be able to retrieve it later
 * @property {string} name - name of the media, should be computed to be human readable
 * @property {Array<Date>} dates - list of date when the media was seen
 * @property {number} time - cursor position of the last time played
 * @property {number} type - type of the media played
 *
 * @constructor
 */
function MediaHisto(url, name, date, time){

  /**
   * Url of the played media
   * @type {string}
   */
  this.url = url || '';

  /**
   * Name of the played media
   * @type {string}
   */
  this.name = name || '';

  /**
   * Dates when the media was seen
   * @type {Array<Date>}
   */
  this.dates = date && [date] || [];

  /**
   * Last time played cursor
   * @type {number}
   */
  this.time = time || 0;

  Object.defineProperty(this, 'type', {
    get: () => {
      return this.url.indexOf('you');
    },
  });

  this.type = 0;

}

MediaHisto.prototype.toString = function(){
  return `${this.url };${this.name};${this.dates.join(',')};${this.time}`;
};

module.exports.History = History;
module.exports.MediaHisto = MediaHisto;
