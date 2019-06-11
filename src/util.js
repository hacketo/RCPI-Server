/**
 * Created by hacketo on 25/05/18.
 */

const fs = require('fs');

function walk(dir, sub){
    sub = sub || 0;
    var results = [];
    var list = fs.readdirSync(dir);
    list.forEach(function(file) {
        if (file[0] !== '.') {
            file = dir + '/' + file;
            var stat = fs.statSync(file);
            if (stat && stat.isDirectory()) {
                if (sub < 3) {
                    results = results.concat(walk(file, sub+1));
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

function deleteFile(filePath){
    fs.unlink(filePath, (err) => {
        //if (err) throw err;
        debug('Subtitle file '+filePath+' was '+(err ? "NOT " : "")+'deleted');
    });
}

var EXT_LIST = ['avi', 'mkv', 'mp4', 'm4v'];

/**
 * Teste l'extention du fichier passé en parametre
 * @param file
 * @returns {boolean}
 */
function isMedia(file){
    var ext = file.substring(file.lastIndexOf('.'));

    if (ext.length > 0){
        ext = ext.substr(1);
        return (EXT_LIST.indexOf(ext.toLowerCase()) != -1);
    }
    return false;
}

function computePacket(action, data){
    return JSON.stringify({action:action, data:data});
}

function sec(ms_){
    return ms_ * 1000;
}

function log(msg){
    console.log.apply(console, arguments);
}
function error(msg){
    console.error.apply(console, arguments);
}
function debug(msg){
    console.log.apply(console, arguments);
}

function getOmxTime(duration){

    function padTime(i) {
        if (i < 10) {
            i = "0" + i;
        }
        return i;
    }

    let d = new Date(duration);
    return padTime(d.getUTCHours())+":"+padTime(d.getUTCMinutes())+":"+padTime(d.getUTCSeconds());
}

module.exports.walk = walk;
module.exports.computePacket = computePacket;
module.exports.sec = sec;

module.exports.deleteFile = deleteFile;

module.exports.log = log;
module.exports.error = error;
module.exports.debug = debug;
module.exports.getOmxTime = getOmxTime;