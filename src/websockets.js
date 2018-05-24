/**
 * Created by hacketo on 25/05/18.
 */


var WebSocketServer = require('ws').Server,
    http = require('http'),
    KEYS = require('./keys').KEYS,
    util = require('./util');

function WSServer(port){
    this.port = port;
}


WSServer.prototype.processRequest = function(req, res){

};


/**
 * Start listening for web sockets and providing http for the embedded client
 * //TODO: update embedded client @see public/index.html
 */
WSServer.prototype.init = function(rcpi){
    var app = http.createServer(this.processRequest.bind(this)).listen(this.port);

    this.server = new WebSocketServer({
        server: app,
        clientTracking: true,
        verifyClient: function(){return true;}
    });

    this.server.on('connection', function(ws) {
        //on_new_connection

        var data = {
            keys : remote,
            films : rcpi.get_available_media()
        };
        console.log('new client');
        ws.send(util.computePacket('init', data));

        ws.on('message', function(msg) {
            var data = JSON.parse(msg);
            console.log(data);
            if (data.key === 'open'){
                if (typeof data.film === 'string' ){
                    rcpi.spawn_omxplayer(data.film, ws);
                }
            }
            else if (data.key === 'reload'){
                ws.send(util.computePacket('reload', rcpi.get_available_media()));
            }
            else{
                rcpi.send_to_omx(data.key, ws);
            }
        });
        ws.once('close', function(code, message) {
            console.log('client closed '+code+' : '+message);
        });
    });


    var url = require('url');
    var path = require('path');
    var baseDirectory = '/public/';   // or whatever base directory you want

    var port = 8080;
    http.createServer(function (request, response) {
        try {
            var requestUrl = url.parse(request.url);

            // need to use path.normalize so people can't access directories underneath baseDirectory
            var fsPath = path.resolve(__dirname, baseDirectory+path.normalize(requestUrl.pathname));

            response.writeHead(200);
            var fileStream = fs.createReadStream(fsPath);
            fileStream.pipe(response);
            fileStream.on('error', function (e) {
                response.writeHead(404);     // assume the file doesn't exist
                response.end();
            })
        } catch (e) {
            response.writeHead(500);
            response.end();     // end the response so browsers don't hang
            console.log(e.stack)
        }
    }).listen(port);
};

WSServer.prototype.close = function(cb){
    this.server.close(cb);
};

var remote = [
    [
        {text:"Play/Pause", key:KEYS.PLAY},
        /*{text:"FullScreen", key:KEYS.FULLSCREEN},
         {text:"HUD", key:KEYS.HUD},*/
        {text:"<<", key:KEYS.PLAYBACK_BACKWARD600},
        {text:"<", key:KEYS.PLAYBACK_BACKWARD30},
        {text:">", key:KEYS.PLAYBACK_FORWARD30},
        {text:">>", key:KEYS.PLAYBACK_FORWARD600}
    ],
    [
        {text:"Vol +", key:KEYS.AUDIO_VOL_UP},
        {text:"Vol -", key:KEYS.AUDIO_VOL_DOWN},
        {text:"Audio >", key:KEYS.AUDIO_TRACK_NEXT},
        {text:"Audio <", key:KEYS.AUDIO_TRACK_PREV}
    ],
    [
        {text:"SousTitre", key:KEYS.SUBTITLE_TOGGLE},
        {text:">", key:KEYS.SUBTITLE_TRACK_NEXT},
        {text:"<", key:KEYS.SUBTITLE_TRACK_PREV},
        {text:"-", key:KEYS.SUBTITLE_DELAY_DEC},
        {text:"+", key:KEYS.SUBTITLE_DELAY_INC}
    ],
    [
        {text:"Infos", key:KEYS.INFOS},
        {text:"Quitter", key:KEYS.QUIT}
    ]
];

module.exports.WSServer = WSServer;

