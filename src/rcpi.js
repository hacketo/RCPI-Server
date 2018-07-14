/**
 * Created by hacketo on 25/05/18.
 */

var fs = require('fs'),
    util = require('./util'),
    youtubedl = require('youtube-dl'),
    getvideoduration = require('get-video-duration'),
    UDPServer = require('./udp').UDPServer,
    WSServer = require('./websockets').WSServer,
    KEYS = require('./keys').KEYS,
    Omx = null;

var exec = require('child_process').exec;

exec('command -v omxplayer', function(err, stdout) {
    if (err || stdout.length === 0) {
        Omx = require('./mock.js');
        console.log('/!\\ MOCK : OMX NOT INSTALLED /!\\');
    }
    else{
        Omx = require('node-omxplayer');
    }
});


function RCPI(config){

    config = Object.assign({
        use_ws : false,
        udp_port : 9878,
        ws_port : 9877,
        mediaDirs : ["/media/pi", "/home/pi/Video"]
    }, config);

    this.mediaDirs = config.mediaDirs;

    this.omx_player = null;
    this.udpServer = null;
    this.wsServer = null;

    this.mediaPath = null;
    this.volume = -500;

    /**
     * Time in milliseconds
     * @type {number}
     * @private
     */
    this.currentMediaDuration_ = -1;

    /**
     * Time in milliseconds
     * @type {number}
     * @private
     */
    this.currentMediaCursor_ = 0;
    /**
     * Time in milliseconds
     * @type {number}
     * @private
     */
    this.lastCheck = 0;
    this.isMediaPlaying = false;

    this.use_ws = config.use_ws;
    this.udp_port = config.udp_port;
    this.ws_port = config.ws_port;

    this.asked_close = false;
    this.mList = [];
    this.mediaEnded = false;
}

RCPI.prototype.init = function(){
    this.udpServer = new UDPServer(this.udp_port);
    this.udpServer.init(this);
    if (this.use_ws){
        this.wsServer = new WSServer(this.ws_port);
        this.wsServer.init(this);
    }
};

RCPI.prototype.get_available_media = function(){
    var l = [];
    this.mediaDirs.forEach(function(i){
        if (fs.existsSync(i)){
            l = l.concat(util.walk(i));
        }
    });
    if (l.length > 0){
        this.mList = l;
        return l;
    }
    return ["/a","/b"];
};

RCPI.prototype.spawn_omxplayer = function(media, receiver){
    var _s = this;
    if (media.startsWith('/')){
        _s.spawn_(media, receiver);
    }
    else {
        youtubedl.getInfo(media, [], function (err, info) {
            if (err) {
                _s.spawn_(media, receiver);
            }
            else {
                _s.spawn_(info.url, receiver, info._duration_raw);
            }
        });
    }
};

/**
 *
 * @param media
 * @param receiver
 * @param {number=} duration
 * @private
 */
RCPI.prototype.spawn_ = function(media, receiver, duration){
    if (typeof duration != 'undefined'){
        this.spawnOk_(media, receiver, duration);
    }

    getvideoduration(media).then((function(s_){
        return function(d){
            s_.spawnOk_(media, receiver, d);
        }
    })(this), function(error){
        console.log(error);
    });
};

/**
 *
 * @param {string} media
 * @param receiver
 * @param {int|float} duration
 * @private
 */
RCPI.prototype.spawnOk_ = function(media, receiver, duration){
    console.log('lancement '+media+' durée '+duration);

    this.currentMediaDuration_ = Math.round(duration * 1000);
    if (this.omx_player == null){
        this.omx_player = Omx(media, 'hdmi', false, this.volume);

        this.omx_player.on('error', msg => {
           console.log("error", msg);
        });

        this.omx_player.on('close', code => {
            console.log("closed", code);

            if (!this.asked_close){
                var i = this.mList.indexOf(this.mediaPath);
                if (i > -1){
                    if (getFilmName(this.mList[i+1]).startsWith(getFilmName(this.mediaPath).substr(0,4))){
                        this.spawn_omxplayer(this.mList[i+1], receiver);
                    }
                }
            }
        });
    }
    else{
        this.omx_player.newSource(media, 'hdmi', false, this.volume);
    }
    this.mediaPath = media;
    this.resetMediaCursor();
    this.sendInfos(receiver)
};


RCPI.prototype.send_to_omx = function(key, receiver){
    if (this.omx_player != null && this.omx_player.running){
        switch(key){
            case KEYS.PLAY:
                this.playPauseCursor();
                this.omx_player.play();
                this.sendInfos(receiver);
                break;
            case KEYS.PLAYBACK_BACKWARD600:
                this.updateMediaCursor();
                this.moveCursor(util.sec(-600));
                this.omx_player.back600();
                this.sendCursorInfos(receiver);
                break;
            case KEYS.PLAYBACK_BACKWARD30:
                this.updateMediaCursor();
                this.moveCursor(util.sec(-30));
                this.omx_player.back30();
                this.sendCursorInfos(receiver);
                break;
            case KEYS.PLAYBACK_FORWARD30:
                this.updateMediaCursor();
                this.moveCursor(util.sec(30));
                this.omx_player.fwd30();
                this.sendCursorInfos(receiver);
                break;
            case KEYS.PLAYBACK_FORWARD600:
                this.updateMediaCursor();
                this.moveCursor(util.sec(600));
                this.omx_player.fwd600();
                this.sendCursorInfos(receiver);
                break;
            case KEYS.AUDIO_TRACK_NEXT:
                this.omx_player.nextAudio();
                break;
            case KEYS.AUDIO_TRACK_PREV:
                this.omx_player.prevAudio();
                break;
            case KEYS.AUDIO_VOL_UP:
                this.volume += 100;
                this.omx_player.volUp();
                break;
            case KEYS.AUDIO_VOL_DOWN:
                this.volume -= 100;
                this.omx_player.volDown();
                break;
            case KEYS.SUBTITLE_TOGGLE:
                this.omx_player.subtitles();
                break;
            case KEYS.SUBTITLE_TRACK_NEXT:
                this.omx_player.nextSubtitle();
                break;
            case KEYS.SUBTITLE_TRACK_PREV:
                this.omx_player.prevSubtitle();
                break;
            case KEYS.SUBTITLE_DELAY_DEC:
                this.omx_player.decSubDelay();
                break;
            case KEYS.SUBTITLE_DELAY_INC:
                this.omx_player.incSubDelay();
                break;
            case KEYS.QUIT:
                this.asked_close = true;
                this.omx_player.quit();
                break;
            case KEYS.INFOS:
                this.omx_player.info();
                break;
            default:
                console.log('key not found '+key);
                break;
        }
    }
};

RCPI.prototype.get_play_packet = function(){
    return [
        this.currentMediaCursor_,
        this.isMediaPlaying,
        this.currentMediaDuration_
    ];
};
RCPI.prototype.get_cursor_packet = function(){
    return [
        this.currentMediaCursor_
    ];
};

RCPI.prototype.sendInfos = function(receiver){
    this.sendTo(receiver, KEYS.FINFOS, this.get_play_packet());
};
RCPI.prototype.sendCursorInfos = function(receiver){
    this.sendTo(receiver, KEYS.FINFOS, this.get_cursor_packet());
};

RCPI.prototype.sendTo = function(receiver, action, data){
    if (typeof receiver === "string"){
        this.udpServer.send(receiver, action, data);
    }
    else{
        if (typeof receiver !== 'undefined' && this.wsServer !== null) {
            receiver.send(util.computePacket(action, data));
        }
    }
};

RCPI.prototype.resetMediaCursor = function(){
    this.currentMediaCursor_ = 0;
    this.isMediaPlaying = true;
    this.lastCheck = +new Date();
};
RCPI.prototype.playPauseCursor = function(){
    this.updateMediaCursor();
    this.isMediaPlaying = !this.isMediaPlaying;

};
RCPI.prototype.updateMediaCursor = function(){
    if (this.isMediaPlaying) {
        this.moveCursor(+new Date() - this.lastCheck);
    }
    this.lastCheck = +new Date();
};

RCPI.prototype.moveCursor = function(d){
    if (this.currentMediaCursor_ + d > this.currentMediaDuration_){
        this.currentMediaCursor_ = this.currentMediaDuration_;
        this.mediaEnded = true;
    }
    else if (this.currentMediaCursor_ + d < 0){
        this.currentMediaCursor_ = 0;
    }
    else {
        this.currentMediaCursor_ = this.currentMediaCursor_ + d;
    }
};

RCPI.prototype.clean_exit = function(){
    if (this.omx_player != null){
        this.omx_player.quit();
    }
    if (this.wsServer !== null) {
        this.wsServer.close(function () {
            console.log('WSServer closed!');
            process.exit(); // should call exitHandler with cleanup
        });
    }
    if (this.udpServer !== null) {
        this.udpServer.close(function () {
            console.log('UDPServer closed!');
        });
    }
};

function getFilmName(path){
    var a = path.split("/");
    return a[a.length -1];
}

module.exports.RCPI = RCPI;
module.exports.KEYS = KEYS;