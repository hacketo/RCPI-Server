/**
 * Created by hacketo on 25/05/18.
 */


var KEYS = {
    PING : 0,
    OPEN : 1,
    PLAY : 2,
    LIST : 3,
    FINFOS : 4,
    PLAYBACK_BACKWARD600 : 5,
    PLAYBACK_BACKWARD30 : 6,
    PLAYBACK_FORWARD30 : 7,
    PLAYBACK_FORWARD600 : 8,
    AUDIO_TRACK_NEXT : 9,
    AUDIO_TRACK_PREV : 10,
    AUDIO_VOL_UP : 11,
    AUDIO_VOL_DOWN : 12,
    SUBTITLE_TOGGLE : 13,
    SUBTITLE_TRACK_NEXT : 14,
    SUBTITLE_TRACK_PREV : 15,
    SUBTITLE_DELAY_DEC : 16,
    SUBTITLE_DELAY_INC : 17,
    INFOS : 18,
    QUIT : 19,

    DEBUG : 22
};

var KEY_STR = (function(){
    var a = {};
    var k = Object.keys(KEYS);
    k.forEach(function(v){
        a[KEYS[v]] = v;
    });
    return a;
})();

module.exports.KEYS = KEYS;
module.exports.KEY_STR = KEY_STR;