const EventEmitter = require('events').EventEmitter;
const spawn = require('child_process').spawn;

const kill = require('tree-kill');

const EXPORT = {};

/**
 * @typedef {{
 * length: number,
 * name: string,
 * progress: {
 *   size: string,
 *   progress: number,
 *   speed: string,
 *   remaining: string
 * }
 * }} DLObject

 */

/**
 *
 */
(function(EXPORT){

/**
 * Download a file at the specified location
 * Possibility to specify a max progress interval, for the progress event
 * @param {string} url - url of the file to download
 * @param {string} path - path to download the file to
 * @param {number=2000} maxIntervalProgress - progress event throttle
 * @return {module:events.internal.EventEmitter}
 */
function wget(url, path, maxIntervalProgress = 2000){

  const emitter = new EventEmitter();

  const wget = spawn('wget', ['-P', path, url]);

  emitter.on('kill', function(){
    kill(wget.pid);
    emitter.emit('close');
  });

  /**
   *
   * @type {DLObject}
   */
  const dlObj = {
    length: 0,
    name: '',
    progress: {
      progress: 0,
      speed: '0M',
      remaining: '0s',
      size: '0K',
    },
  };

  const throttle = ThrottleMax(maxIntervalProgress);

  /**
   *
   */
  const parseData = (function(){

    let buffer = [];

    /**
     * @return ?Array<>
     */
    return function(data, from){
      const dataStr = data + '';
      const lines = [];
      for (let i = 0, len = dataStr.length; i < len; i++){
        if (dataStr[i] === '\n'){
          lines.push(buffer.join(''));
          buffer = [];
        }
        else {
          buffer.push(dataStr[i]);
        }
      }

      let r = null;

      if (lines.length > 0){
        r = lines.map(line => {
          if (line.length > 0){
            //console.log(from + '-->' + line);
            return parseLine(line, dlObj);
          }
        });
      }
      buffer.length = 0;

      return r;
    };

  })();

  const handleData = function(data, from){
    const r = parseData(data, from);

    // if r is array
    // might be [, null, DLObject] ?
    if (r != null){
      for (let i = r.length - 1; i > 0; i--){
        if (r[i] != null){
          throttle(() => {
            emitter.emit('progress', r);
          });
          return;
        }
        else if (r[i] === null){
          emitter.emit('error', data);
        }
      }
    }
  };

  wget.stdout.on('data', (data) => handleData(data, 'stdout'));
  wget.stderr.on('data', (data) => handleData(data, 'stderr'));

  wget.on('close', (code) => {
    emitter.emit('close', code);
  });

  return emitter;

}

const remainingREG = /(:?([0-9]{0,2})h)?(:?([0-9]{0,2})m)?(:?([0-9]{0,2})s)?/;

const sizeREG = /[MKGB]/;

const parseLineData = function(str){
  const S_SIZE = 0, S_DOTS = -1, S_PERCENTS = 1, S_SPEED = 2, S_TIME = 3;

  let state = S_SIZE;

  const line_data = [];

  let buffer = [];
  for (let i = 0, len = str.length; i < len; i++){
    switch (state){
      case S_SIZE:{
        if (buffer.length > 0 && str[i] === ' '){
          state = S_DOTS;
          line_data[S_SIZE] = buffer.join('');
          buffer.length = 0;
        }
        else {
          if (str[i] !== ' ' && (+str[i] === +str[i] || buffer.length > 0)){
            buffer.push(str[i]);
          }
        }
        break;
      }
      case S_DOTS:{
        if (str[i] === ' ' || str[i] === '.'){
          continue;
        }
        state = S_PERCENTS;
      }
      case S_PERCENTS:{
        if (str[i] === '%'){
          state = S_SPEED;
          line_data[S_PERCENTS] = +buffer.join('');
          buffer.length = 0;
        }
        else {
          if (str[i] !== ' ' && +str[i] === +str[i]){
            buffer.push(str[i]);
          }
        }
        break;
      }
      case S_SPEED:{
        if (str[i] === ' ' && buffer.length > 0){
          state = S_TIME;
          line_data[S_SPEED] = buffer.join('');
          buffer.length = 0;
        }
        else {
          if (str[i] !== ' '){
            buffer.push(str[i]);
          }
        }
        break;
      }
      case S_TIME:{
        if ((str[i] === ' ' || i === len - 1) && buffer.length > 0){
          if (str[i] !== ' '){
            buffer.push(str[i]);
          }
          state = S_TIME + 1;
          line_data[S_TIME] = buffer.join('');
          buffer.length = 0;
          break;
        }
        else {
          if (str[i] !== ' '){
            buffer.push(str[i]);
          }
        }
        break;
      }
      default:
        break;
    }
  }
  return line_data;
};

/**
 * @param {string} line
 * @param {DLObject} dlObj
 *
 * @type {function(string, DLObject):DLObject|null|void}
 *
 * @return {DLObject|null|undefined} dlObj if progress line, null if error
 */
const parseLine = (function(){

  let readState = -1;

  const stateFN = {
    // HTTP request sent, awaiting response... 200 OK
    // HTTP request sent, awaiting response... 404 Not Found
    [-1](line){
      if (line.endsWith('200 OK')){
        readState = 0;
      }
      else if (line.endsWith('404 Not Found')){
        return null;
      }
    },
    // Length: 3430147472 (3,2G) [application/force-download]
    0(line, dlObj){
      const indexOf = line.indexOf(': ');
      if (indexOf > -1){
        dlObj.length = +line.slice(indexOf + 2, line.indexOf(' ', indexOf + 2));
        readState = 1;
      }
    },
    // Saving to: ‘./file.mkv’
    1(line, dlObj){
      line = line.replace(/[‘’«»]/g, '');
      const indexOf = line.lastIndexOf(' ');
      if (indexOf > -1){
        dlObj.name = line.slice(indexOf).trim();
        readState = 2;
      }
    },
    //      0K .......... .......... .......... .......... ..........  0%  571K 97m47s
    2(line, dlObj){
      let progressData = parseLineData(line);

      if ((progressData[0] || '').match(sizeREG)){
        dlObj.progress.size = progressData[0];
      }
      if (+progressData[1] === +progressData[1]){
        dlObj.progress.progress = +progressData[1];
      }
      if ((progressData[2] || '').match(sizeREG)){
        dlObj.progress.speed = progressData[2];
      }

      remainingREG.lastIndex = 0;
      const result = remainingREG.exec(progressData[3]);
      if (result !== null){
        //dlObj.progress.remaining = ((+result[2] || 0) /* H */ * 3600 + (+result[4] || 0) * 60 + (+result[6] || 0)) * 1000;
        dlObj.progress.remaining = result[0];
      }

      return dlObj;
    },
  };

  /**
   * @return {DLObject|null|void} dlObj if progress line, null if error
   */
  return function(line, dlObj){
    return stateFN[readState](line, dlObj);
  };
})();

/**
 * @typedef {{
 *  length: number,
 *  name: string,
 *  progress: {
 *    progress:number,
 *    speed: string,
 *    remaining: string,
 *    size: string
 *  }
 * }} ProgressDl
 */


/**
 * Will throttle a function that will be called at the given interval
 * useful when you want to reduce the amount of call for a spammed function
 *
 * @param {number} minCallInterval - minimum time before the next function call
 * @return {function(function)} helper to throttle the given function
 */

function ThrottleMax(minCallInterval){

  let lastEmitTime = 0;
  let throttleTimeout = null;

  const throttle = function(callback){
    if (throttleTimeout !== null){
      clearTimeout(throttleTimeout);
      throttleTimeout = null;
    }

    if (new Date - lastEmitTime >= minCallInterval){
      lastEmitTime = +new Date;
      callback();
    }
    else {
      throttleTimeout = setTimeout(function(){
        throttle(callback);
      }, lastEmitTime + minCallInterval - new Date);
    }
  };

  return throttle;
}

EXPORT['wget'] = wget;

if (process.env.NODE_ENV !== 'production'){
  EXPORT['parseLineData'] = parseLineData;
  EXPORT['parseLine'] = parseLine;
  EXPORT['ThrottleMax'] = ThrottleMax;
}

})(EXPORT);


module.exports = EXPORT;
