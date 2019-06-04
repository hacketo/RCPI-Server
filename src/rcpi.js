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
    Clients = require('./clients').Clients,
    Omx = null;

var exec = require('child_process').exec;

exec('command -v omxplayer', function(err, stdout) {
    if (err || stdout.length === 0) {
        Omx = require('./mock.js');
        util.log('/!\\ MOCK : OMX NOT INSTALLED /!\\');
    }
    else{
        Omx = require('node-omxplayer');
    }
});

/**
 *
 * @param config
 * @constructor
 */
function RCPI(config){

    config = Object.assign({
        use_ws : false,
        udp_port : 9878,
        ws_port : 9877,
        mediaDirs : ["/media/pi", "/home/pi/Video"],
        downloadDir: "/home/pi/Video",
        tempDir: __dirname+"/../temp",
    }, config);

    this.mediaDirs = config.mediaDirs;
    this.downloadDir = config.downloadDir;
    this.tempDir = config.tempDir;

    this.omx_player = null;
    this.udpServer = null;
    this.wsServer = null;

    this.mediaPath = "";
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
    this.lastCheck_ = 0;
    this.isMediaPlaying = false;

    this.use_ws = config.use_ws;
    this.udp_port = config.udp_port;
    this.ws_port = config.ws_port;

	/**
	 * true if a client asked the omx player to close
	 * @type {boolean}
	 */
	this.asked_close = false;

	/**
	 * Liste of media availables
	 * @type {Array<string>}
	 */
	this.mList = [];
    this.mediaEnded = false;

	/**
	 *
	 * @type {Clients}
	 */
	this.clients = null;
}

/**
 * Init and starts sockets listeners
 */
RCPI.prototype.init = function(){

	this.clients = new Clients();

    this.udpServer = new UDPServer(this.clients, this.udp_port);
    this.udpServer.init(this);
    if (this.use_ws){
        this.wsServer = new WSServer(this.clients, this.ws_port);
        this.wsServer.init(this);
    }

    this.get_available_media();
};

RCPI.prototype.onPING = function(client){
    this.updateMediaCursor();
    client.send(KEYS.FINFOS, this.get_play_packet());
}


RCPI.prototype.onLIST = function(client){
    client.send(KEYS.LIST, this.get_available_media());
}


RCPI.prototype.onOPEN = function(client, path){
    if (!path){
        util.log('no path specified');
        return;
    }
    this.spawn_omxplayer(path);
}


RCPI.prototype.onDEBUG = function(client, cmd){
    if (!cmd){
        util.log('no cmd specified');
        return;
    }
    
    if (cmd === 'sub'){
        if(this.sub_debug(client)){

        }
        else{
            
        }
    }
    
    if (cmd === 'unsub'){
        if(this.unsub_debug(client)){
            
        }
        else{

        }
    }
}

/**
 * Browse this.mediaDirs to get a list of media
 * @returns {*}
 */
RCPI.prototype.get_available_media = function(){
    var l = [];
    this.mediaDirs.forEach(function(i){
        try {
            if (fs.existsSync(i)) {
                l = l.concat(util.walk(i));
            }
        }catch(e){

        }
    });
    if (l.length > 0){
        this.mList = l;
        return l;
    }
    return RCPI.MOCK_MEDIALIST;
};
RCPI.MOCK_MEDIALIST = ["/a","/b"];

const VTT_EXT = ".vtt";
/**
 *
 * @param {string} media
 */
RCPI.prototype.spawn_omxplayer = function(media){
    this.asked_close = false;
    if (media.startsWith('/')){
        this.spawn_(media);
    }
    else {
        //TODO-tt empty for regular quality
        let args = [];

        youtubedl.getInfo(media, args, (err, info) => {
            if (err) {
                util.error(err);
            }
            else {

                let url = info.url;
                let duration = info._duration_raw;

                let options = {
                    // Write automatic subtitle file (youtube only)
                    auto: true,
                    // Downloads all the available subtitles.
                    all: false,
                    // Subtitle format. YouTube generated subtitles
                    // are available ttml or vtt.
                    format: 'srt',
                    // Languages of subtitles to download, separated by commas.
                    lang: 'fr',
                    // The directory to save the downloaded files in.
                    cwd: this.tempDir,
                };

                youtubedl.getSubs(url, options, (err, files) => {
                    if (err){
                        util.error(err);
                    }
                    let subtitleFile;
                    if (files && files[0]){
                        subtitleFile = files[0];

                        if (subtitleFile.endsWith(VTT_EXT)){

                            import fs from 'fs';
                            import vtt2srt from 'vtt-to-srt';

                            let newFileName = this.tempDir + '/'+subtitleFile.slice(0, subtitleFile.length - VTT_EXT.length)+'.srt';

                            fs.createReadStream(this.tempDir + '/'+subtitleFile)
                                .pipe(vtt2srt())
                                .pipe(fs.createWriteStream(newFileName));



                            // TODO // new filename
                        }
                    }

                    console.log('subtitle files downloaded:', files);
                    this.spawn_(url, duration, subtitleFile);
                });




            }
        });
    }
};

/**
 *
 * @param {string} media
 * @param {number=} duration
 * @private
 */
RCPI.prototype.spawn_ = function(media, duration){
    if (RCPI.MOCK_MEDIALIST.indexOf(media) > -1){
        duration = 10000;
    }

    if (typeof duration !== 'undefined'){
        this.spawnOk_(media, duration);
        return;
    }

    getvideoduration(media).then((d) => {
    	this.spawnOk_(media, d);
    }, function(error){
        util.error(media, error);
    });
};

/**
 *
 * @param {string} media
 * @param {int|float} duration
 * @private
 */
RCPI.prototype.spawnOk_ = function(media, duration, subtitles){
    util.log('lancement '+media+' durée '+duration);

    this.currentMediaDuration_ = Math.round(duration * 1000);

    // If omx was never initialized create new instance and setup listeners
    if (this.omx_player == null){
        this.omx_player = Omx(media, 'hdmi', false, this.volume, subtitles);

        this.omx_player.on('error', msg => {
            util.error("error", msg);
            this.clients.timeout_duration = 240000;
        });

        this.omx_player.on('close', code => {
            util.log("closed", code);

            if (!this.asked_close){
                var i = this.mList.indexOf(this.mediaPath);
                if (i > -1 && this.mList[i+1]){
                    if (getFilmName(this.mList[i+1]).startsWith(getFilmName(this.mediaPath).substr(0,8))){
                        this.spawn_omxplayer(this.mList[i+1]);
                    }
                }
            }
        });
    }
    else{
        this.omx_player.newSource(media, 'hdmi', false, this.volume);
    }

    // New media should be spawning now, so we might want to update the timeout duration for the connected clients
    // It should be duration of the media + 5 min or 10 min ?
    this.clients.update_timeout(this.currentMediaDuration_);

    this.mediaPath = media;
    this.resetMediaCursor();
    this.sendInfos();
};


RCPI.prototype.send_to_omx = function(client, key){
    if (this.omx_player != null && this.omx_player.running){
        switch(key){
            case KEYS.PLAY:
                this.playPauseCursor();
                this.omx_player.play();
                this.sendInfos(client);
                break;
            case KEYS.PLAYBACK_BACKWARD600:
                this.updateMediaCursor();
                this.moveCursor(util.sec(-600));
                this.omx_player.back600();
                this.sendCursorInfos(client);
                break;
            case KEYS.PLAYBACK_BACKWARD30:
                this.updateMediaCursor();
                this.moveCursor(util.sec(-30));
                this.omx_player.back30();
                this.sendCursorInfos(client);
                break;
            case KEYS.PLAYBACK_FORWARD30:
                this.updateMediaCursor();
                this.moveCursor(util.sec(30));
                this.omx_player.fwd30();
                this.sendCursorInfos(client);
                break;
            case KEYS.PLAYBACK_FORWARD600:
                this.updateMediaCursor();
                this.moveCursor(util.sec(600));
                this.omx_player.fwd600();
                this.sendCursorInfos(client);
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
                this.isMediaPlaying = false;
                break;
            case KEYS.INFOS:
                this.omx_player.info();
                break;
            default:
                util.log('key not found '+key);
                break;
        }
    }
};

RCPI.prototype.get_play_packet = function(){
    return [
        this.currentMediaCursor_,
        this.isMediaPlaying,
        this.currentMediaDuration_,
	    this.mediaPath
    ];
};
RCPI.prototype.get_cursor_packet = function(){
    return [
        this.currentMediaCursor_
    ];
};

RCPI.prototype.sendInfos = function(){
    this.broadcast(KEYS.FINFOS, this.get_play_packet());
    this.clients.update_timeout(this.isMediaPlaying ? (this.currentMediaDuration_ - this.currentMediaCursor_) : 0);
};
RCPI.prototype.sendCursorInfos = function(){
    this.broadcast(KEYS.FINFOS, this.get_cursor_packet());
    this.clients.update_timeout(this.isMediaPlaying ? (this.currentMediaDuration_ - this.currentMediaCursor_) : 0);
};

RCPI.prototype.broadcast = function(action, data){
	this.clients.broadcast(action, data);
};

RCPI.prototype.resetMediaCursor = function(){
    this.currentMediaCursor_ = 0;
    this.isMediaPlaying = true;
    this.lastCheck_ = +new Date();
};
RCPI.prototype.playPauseCursor = function(){
    this.updateMediaCursor();
    this.isMediaPlaying = !this.isMediaPlaying;

};
RCPI.prototype.updateMediaCursor = function(){
    if (this.isMediaPlaying) {
        this.moveCursor(+new Date() - this.lastCheck_);
    }
    this.lastCheck_ = +new Date();
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
            util.log('WSServer closed!');
            process.exit(); // should call exitHandler with cleanup
        });
    }
    if (this.udpServer !== null) {
        this.udpServer.close(function () {
            util.log('UDPServer closed!');
        });
    }
};

RCPI.prototype.download = function(client, url){
    let mediaUrl = url;
    wget({
        url:  url,
        dest: this.downloadDir,      // destination path or path with filenname, default is ./
        timeout: 2000       // duration to wait for request fulfillment in milliseconds, default is 2 seconds
    }, function(error, response){
        if(error){
            
        }
        else{

        }
    });
};

RCPI.prototype.sub_debug = function(client){
    if (this.subs.indexOf(client) === -1){
        this.subs.push(client);
        return true;
    }
    return false;
};

RCPI.prototype.unsub_debug = function(client){
    let iof = this.subs.indexOf(client);
    if (iof > -1){
        this.subs.splice(iof, 1);
        return true;
    }
    return false;
};


function getFilmName(path){
    var a = path.split("/");
    return a[a.length -1];
}

module.exports.RCPI = RCPI;
module.exports.KEYS = KEYS;