/**
 * Created by hacketo on 25/05/18.
 */

var fs = require('fs');

function walk(dir, sub){
    sub = sub || 0;
    var results = [];
    var list = fs.readdirSync(dir);
    list.forEach(function(file) {
        if (file[0] !== '.') {
            file = dir + '/' + file;
            var stat = fs.statSync(file);
            if (stat && stat.isDirectory()) {
                if (sub < 2) {
                    results = results.concat(walk(file, sub+1));
                }
            }
            else {
                if (isFilm(file)){
                    results.push(file);
                }
            }
        }
    });
    return results;
}

var EXT_LIST = ['avi', 'mkv', 'mp4', 'm4v'];

/**
 * Teste l'extention du fichier passé en parametre
 * @param file
 * @returns {boolean}
 */
function isFilm(file){
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

module.exports.walk = walk;
module.exports.computePacket = computePacket;
module.exports.sec = sec;