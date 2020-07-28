/**
 * Created by hacketo on 28/07/20.
 */

const exec = require('child_process').exec;


const PLAYERS = ['omxplayer', 'mpv'];
const PLAYER_PACKAGE = ['node-omxplayer', './mpv.js'];


const checkPlayerAvailability = function(playerCmd){
  return new Promise((resolve, reject) => {
    if (PLAYERS.includes(playerCmd)){
        exec(`command -v ${playerCmd}`, function(err, stdout){
          if (err || stdout.length === 0){
            reject(err || stdout);
          }
          else {
            resolve(PLAYER_PACKAGE[PLAYERS.indexOf(playerCmd)]);
          }
        })
    }
    else {
      reject(`player ${playerCmd} does not exists`);
    }
  });
};

const getPlayer = function(){
  const checkPromises = PLAYERS.map(v => checkPlayerAvailability(v).catch(() => {}));
  return Promise.all(checkPromises).then( results => {
    for (let i = 0, len = results.length; i < len; i++){
      if (results[i]){
        return results[i];
      }
    }
    return './mock.js';
  }).then( r => {
    return require(r);
  });
};

module.exports = {
  getPlayer: getPlayer,
};
