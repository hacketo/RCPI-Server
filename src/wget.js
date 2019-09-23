const EventEmitter = require('events').EventEmitter;
const spawn = require('child_process').spawn;


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

function wget(url, path){

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
    const progressData = str.replace(/\.+/gm, '').trim().split(/\s+/);

    return progressData;
  };


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
              emitter.emit('progress', dlObj);
              readState += 1;
            }
          }
          else if (readState === 1){
            if (val[val.length - 1] === '%'){
              dlObj.progress.progress = val.slice(0, -1);
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
              emitter.emit('progress', dlObj);
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

module.exports = {
  wget: wget
};