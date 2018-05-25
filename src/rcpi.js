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
    //Omx = require('./mock.js');
    Omx = require('node-omxplayer');


function RCPI(config){

    config = Object.assign({
        use_ws : false,
        udp_port : 9878,
        ws_port : 9877
    }, config);

    this.mediaDir = "/media/pi";
    this.omx_player = null;

    this.udpServer = null;
    this.wsServer = null;

    this.currentFilmDuration_ = -1;
    this.currentFilmCursor_ = 0;
    this.lastCheck = 0;
    this.isFilmPlaying = false;

    this.use_ws = config.use_ws;
    this.udp_port = config.udp_port;
    this.ws_port = config.ws_port;
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
    if (fs.existsSync(this.mediaDir)){
        return util.walk(this.mediaDir);
    }
    return ["a","b"];
};

RCPI.prototype.spawn_ = function(film, receiver){
    getvideoduration(film).then((function(self){
        return function(duration){
            self.spawnOk_(film, receiver, duration)
        }
    })(this), function(error){
        console.log(error);
    });
};

RCPI.prototype.spawnOk_ = function(film, receiver, duration){
    console.log('lancement '+film+' durée '+duration);

    this.currentFilmDuration_ = duration * 1000;
    if (this.omx_player == null){
        this.omx_player = Omx(film, 'hdmi', false, -500);
    }
    else{
        this.omx_player.newSource(film, 'hdmi', false, -500);
    }
    this.resetFilmCursor();
    this.sendTo(receiver, 'finfos', this.get_play_packet());
};

RCPI.prototype.spawn_omxplayer = function(film, receiver){
    var _s = this;
    if (film.startsWith('https://youtu') || film.startsWith('http://youtu')){
        youtubedl.getInfo(film, [], function(err, info) {
            if (err) throw err;
            _s.spawn_(info.url,receiver);
        });
    }
    else{
        this.spawn_(film,receiver);
    }
};

RCPI.prototype.send_to_omx = function(key, receiver){
    if (this.omx_player != null && this.omx_player.running){
        switch(key){
            case KEYS.PLAY:
                this.playPauseCursor();
                this.omx_player.play();
                this.sendTo(receiver, 'finfos', this.get_play_packet());
                break;
            case KEYS.FULLSCREEN:
                break;
            case KEYS.HUD:
                break;
            case KEYS.PLAYBACK_BACKWARD600:
                this.updateFilmCursor();
                this.moveCursor(util.sec(-600));
                this.omx_player.back600();
                this.sendTo(receiver, 'finfos', this.get_cursor_packet());
                break;
            case KEYS.PLAYBACK_BACKWARD30:
                this.updateFilmCursor();
                this.moveCursor(util.sec(-30));
                this.omx_player.back30();
                this.sendTo(receiver, 'finfos', this.get_cursor_packet());
                break;
            case KEYS.PLAYBACK_FORWARD30:
                this.updateFilmCursor();
                this.moveCursor(util.sec(30));
                this.omx_player.fwd30();
                this.sendTo(receiver, 'finfos', this.get_cursor_packet());
                break;
            case KEYS.PLAYBACK_FORWARD600:
                this.updateFilmCursor();
                this.moveCursor(util.sec(600));
                this.omx_player.fwd600();
                this.sendTo(receiver, 'finfos', this.get_cursor_packet());
                break;
            case KEYS.AUDIO_TRACK_NEXT:
                this.omx_player.nextAudio();
                break;
            case KEYS.AUDIO_TRACK_PREV:
                this.omx_player.prevAudio();
                break;
            case KEYS.AUDIO_VOL_UP:
                this.omx_player.volUp();
                break;
            case KEYS.AUDIO_VOL_DOWN:
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
    return {
        action  : this.isFilmPlaying ? "play" : "stop" ,
        duration: this.currentFilmDuration_ ,
        cursor  : this.currentFilmCursor_
    };
};
RCPI.prototype.get_cursor_packet = function(){
    return {
        cursor  : this.currentFilmCursor_
    };
};

RCPI.prototype.sendTo = function(receiver, action, data){
    if (typeof receiver === "string"){
        this.udpServer.send(action, data, receiver);


    }
    else{
        if (typeof receiver !== 'undefined' && this.wsServer !== null) {
            receiver.send(util.computePacket(action, data));
        }
    }
};



RCPI.prototype.resetFilmCursor = function(){
    this.currentFilmCursor_ = 0;
    this.isFilmPlaying = true;
    this.lastCheck = +new Date();
};
RCPI.prototype.playPauseCursor = function(){
    this.updateFilmCursor();
    this.isFilmPlaying = !this.isFilmPlaying;

};
RCPI.prototype.updateFilmCursor = function(){
    if (this.isFilmPlaying) {
        moveCursor(+new Date() - this.lastCheck);
    }
    this.lastCheck = +new Date();
};

RCPI.prototype.moveCursor = function(d){
    if (this.currentFilmCursor_ + d > this.currentFilmDuration_){
        this.currentFilmCursor_ = this.currentFilmDuration_
    }
    else if (this.currentFilmCursor_ + d < 0){
        this.currentFilmCursor_ = 0
    }
    else {
        this.currentFilmCursor_ = this.currentFilmCursor_ + d;
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

module.exports.RCPI = RCPI;
module.exports.KEYS = KEYS;