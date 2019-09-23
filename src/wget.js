const EventEmitter = require('events').EventEmitter;
const spawn = require('child_process').spawn;

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

  let state = -1;

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

  let readState = 0;

  const remainingREG = /(:?([0-9]{0,2})h)?(:?([0-9]{0,2})m)?(:?([0-9]{0,2})s)?/;
  const sizeREG = /[MKGB]/;

  const parseData = function(str){
    return str.replace(/\.+/gm, '').trim().split(/\s+/);
  };

  const throttle = ThrottleMax(maxIntervalProgress);

  const parseLine = function(line){
    switch (state){
      case -1:
        if (line.startsWith('Length:')){
          dlObj.length = +line.slice(8, line.indexOf(' ', 8));
        }
        else if (line.startsWith('Saving to:')){
          dlObj.name = line.slice(10, line.indexOf(' ', 10));
          state = 1;
        }
        else if (line.endsWith('404 Not Found') || line.startsWith('failed:')){
          state = 0;
          emitter.emit('error', line);
        }
        break;
      case 0:
        emitter.emit('error', line);
        break;
      case 1:{
        let progressData = parseData(line);

        progressData.forEach(val => {
          if (val.length <= 0){
            return;
          }

          if (readState === 0){
            if ((val[val.length - 1] || '').match(sizeREG)){
              dlObj.progress.size = val;
              readState += 1;
            }
          }
          else if (readState === 1){
            if (val[val.length - 1] === '%'){
              dlObj.progress.progress = +val.slice(0, -1);
              readState += 1;
            }
          }
          else if (readState === 2){
            if ((val[val.length - 1] || '').match(sizeREG)){
              dlObj.progress.speed = val;
              readState += 1;
            }
          }
          else if (readState === 3){
            remainingREG.lastIndex = 0;
            const result = remainingREG.exec(val);
            if (result !== null){
              //dlObj.progress.remaining = ((+result[2] || 0) /* H */ * 3600 + (+result[4] || 0) * 60 + (+result[6] || 0)) * 1000;
              dlObj.progress.remaining = result[0];
              readState = 0;

              throttle(() => {
                emitter.emit('progress', dlObj);
              });

            }
          }
        });

        break;
      }
      default:
        break;
    }
  };

  wget.stderr.on('data', (() => {
    let buffer = [];

    return (data) => {
      const dataStr = data + '';

      //console.error(dataStr);

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

      if (lines.length > 0){
        lines.forEach(line => {
          if (line.length > 0){
            parseLine(line);
          }
        });
      }
    };
  })());

  wget.on('close', (code) => {
    emitter.emit('close', code);
  });

  return emitter;

}


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

    if (lastEmitTime === 0 || new Date - lastEmitTime >= minCallInterval){
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

module.exports = {
  wget: wget,
};
