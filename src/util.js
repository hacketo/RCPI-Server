/**
 * Created by hacketo on 25/05/18.
 */

let DEBUG = true;
let LOG = true;

const fs = require('fs');

function walk(dir, sub){
  sub = sub || 0;
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    if (file[0] !== '.') {
      file = `${dir }/${ file}`;
      const stat = fs.statSync(file);
      if (stat && stat.isDirectory()) {
        if (sub < 3) {
          results = results.concat(walk(file, sub + 1));
        }
      }
      else {
        if (isMedia(file)){
          results.push(file);
        }
      }
    }
  });
  return results;
}



/**
 * read a file from its path
 * @param {string} filePath
 * @return {Promise<string>}
 */
function readFile(filePath){
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err){
        reject(err);
      }
      else {
        resolve(data);
      }
    });
  });
}

/**
 * write in a n utf-8 file from its path
 * @param {string} filePath
 * @param {string} fileData
 * @return {Promise<string>} - resolved with filePath
 */
function writeFile(filePath, fileData){
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, fileData, (err) => {
      if (err){
        reject(err);
      }
      else {
        resolve(filePath);
      }
    });
  });
}

/**
 * Delete a set of files that are not in the excepts list
 * @param {string} dir - dir path
 * @param {Array<string>} files - files path
 * @param {Array<string>=} excepts - list of files to exclude from the file list
 * @return {Promise<Array<string>>}
 */
function deleteFiles(dir, files, excepts){
  excepts = excepts || [];

  const promises = [];

  if (Array.isArray(files)){
    files.forEach(file => {
      if (file){
        file = dir + file;
        if (!excepts.includes(file)){
          promises.push(deleteFile(file));
        }
      }
    });
  }

  return Promise.all(promises);
}

/**
 * Delete a file from its path
 * @param {string} filePath
 * @return {Promise<string>}
 */
function deleteFile(filePath){
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (err) => {
      //if (err) throw err;
      debug(`Subtitle file ${filePath} was ${err ? 'NOT ' : ''}deleted`);
      if (err){
        reject(err);
      }
      else {
        resolve(filePath);
      }
    });
  });
}
/**
 * check if a file exists
 * @param {string} filePath
 * @return {boolean}
 */
function existsSync(filePath){
  return fs.existsSync(filePath);
}

const EXT_LIST = ['avi', 'mkv', 'mp4', 'm4v'];

/**
 * Teste l'extention du fichier passé en parametre
 * @param file
 * @returns {boolean}
 */
function isMedia(file){
  let ext = file.substring(file.lastIndexOf('.'));

  if (ext.length > 0){
    ext = ext.substr(1);
    return (EXT_LIST.indexOf(ext.toLowerCase()) != -1);
  }
  return false;
}

function computePacket(action, data){
  return JSON.stringify({action: action, data: data});
}

function sec(ms_){
  return ms_ * 1000;
}

function log(msg){
  if (module.exports.LOG){
    console.log.apply(console, arguments);
  }
}
function error(msg){
  console.error.apply(console, arguments);
}
function debug(msg){
  if (module.exports.DEBUG){
    console.log.apply(console, arguments);
  }
}

function getOmxTime(duration){

  function padTime(i) {
    if (i < 10) {
      i = `0${ i}`;
    }
    return i;
  }

  const d = new Date(duration);
  return `${padTime(d.getUTCHours())}:${padTime(d.getUTCMinutes())}:${padTime(d.getUTCSeconds())}`;
}

/**
 * @see https://stackoverflow.com/a/29202760/2538473
 * @param str
 * @param size
 * @returns {string}
 */
function subtitleMaxLineLength(str, size) {

  if (str.length <= size){
    return str;
  }

  const lines = str.split(/\n/);

  for (let i = 0, len = lines.length; i < len; i++){
    if (lines[i].length <= size){
      continue;
    }

    const str = lines[i];

    const numChunks = Math.ceil(str.length / size);
    const chunks = [];

    let newSize = 0;
    for (let i = 0, o = 0; i < numChunks; ++i) {
      let nextO = str.indexOf(' ', o + size);
      if (nextO === -1){
        nextO = str.length;
        newSize = nextO - o;
      }
      else {
        nextO += 1;
        newSize = nextO - o - 1;
      }

      if (newSize <= 0){
        continue;
      }

      const chunk = str.substr(o, newSize);


      chunks[i] = chunk;
      o += newSize + 1;
    }

    lines[i] = chunks.join('\n');
  }

  return lines.join('\n');
}

module.exports.LOG = LOG;
module.exports.DEBUG = DEBUG;
module.exports.walk = walk;
module.exports.computePacket = computePacket;
module.exports.sec = sec;

module.exports.existsSync = existsSync;
module.exports.readFile = readFile;
module.exports.writeFile = writeFile;
module.exports.deleteFile = deleteFile;
module.exports.deleteFiles = deleteFiles;

module.exports.log = log;
module.exports.error = error;
module.exports.debug = debug;
module.exports.getOmxTime = getOmxTime;
module.exports.subtitleMaxLineLength = subtitleMaxLineLength;
