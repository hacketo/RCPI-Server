/**
 * Created by hacketo on 25/05/18.
 */


const WebSocketServer = require('ws').Server;
const http = require('http');
const KEYS = require('./keys').KEYS;
const util = require('./util');
const Client = require('./client').Client;
const nutil = require('util');

/**
 *
 * @param {Clients} clients
 * @param {number} port
 *
 * @constructor
 */
function WSServer(clients, port){
  this.port = port;
  this.clients = clients;
}

WSServer.prototype.processRequest = function(req, res){

};

WSServer.prototype.get_client_provider = function(){
  return rinfo => {
    return new WSClient(rinfo, rinfo.url);
  };
};


/**
 * Start listening for web sockets and providing http for the embedded client
 * //TODO: update embedded client @see public/index.html
 */
WSServer.prototype.init = function(rcpi){
  const app = http.createServer(this.processRequest.bind(this)).listen(this.port);

  this.server = new WebSocketServer({
    server: app,
    clientTracking: true,
    verifyClient(){return true;},
  });


  this.server.on('connection', /** @param {WebSocket} ws*/ ws => {

    const client = this.clients.handle_client(this, ws);

    console.log('new client');

    client.send('init', {
      keys: remote,
      films: rcpi.get_available_media(),
    });


    ws.on('message', function(msg) {
      const data = JSON.parse(msg);
      console.log(data);

      client.ping();

      if (data.key === 'open'){
        if (typeof data.film === 'string'){
          rcpi.spawn_omxplayer(data.film);
        }
      }
      else if (data.key === 'reload'){
        client.send('reload', rcpi.get_available_media());
      }
      else {
        rcpi.send_to_omx(data.key);
      }
    });
    ws.once('close', function(code, message) {
      console.log(`client closed ${code} : ${message}`);
      client.close();
    });
  });


  const url = require('url');
  const path = require('path');
  const baseDirectory = '/public/'; // or whatever base directory you want

  const port = 8080;
  http.createServer(function(request, response) {
    try {
            const requestUrl = url.parse(request.url);

            // need to use path.normalize so people can't access directories underneath baseDirectory
            const fsPath = path.resolve(__dirname, baseDirectory + path.normalize(requestUrl.pathname));

            response.writeHead(200);
            const fileStream = fs.createReadStream(fsPath);
            fileStream.pipe(response);
            fileStream.on('error', function(e) {
              response.writeHead(404); // assume the file doesn't exist
              response.end();
            });
        } catch (e) {
            response.writeHead(500);
            response.end(); // end the response so browsers don't hang
            console.log(e.stack);
        }
  }).listen(port);
};

/**
 *
 * @param {function()} cb
 */
WSServer.prototype.close = function(cb){
  this.server.close(cb);
};

WSServer.prototype.idFromRInfo = function(rinfo){
  return `${rinfo.url}`;
};

var remote = [
  [
        {text: 'Play/Pause', key: KEYS.PLAY},
        /*{text:"FullScreen", key:KEYS.FULLSCREEN},
         {text:"HUD", key:KEYS.HUD},*/
        {text: '<<', key: KEYS.PLAYBACK_BACKWARD600},
        {text: '<', key: KEYS.PLAYBACK_BACKWARD30},
        {text: '>', key: KEYS.PLAYBACK_FORWARD30},
        {text: '>>', key: KEYS.PLAYBACK_FORWARD600},
  ],
  [
        {text: 'Vol +', key: KEYS.AUDIO_VOL_UP},
        {text: 'Vol -', key: KEYS.AUDIO_VOL_DOWN},
        {text: 'Audio >', key: KEYS.AUDIO_TRACK_NEXT},
        {text: 'Audio <', key: KEYS.AUDIO_TRACK_PREV},
  ],
  [
        {text: 'SousTitre', key: KEYS.SUBTITLE_TOGGLE},
        {text: '>', key: KEYS.SUBTITLE_TRACK_NEXT},
        {text: '<', key: KEYS.SUBTITLE_TRACK_PREV},
        {text: '-', key: KEYS.SUBTITLE_DELAY_DEC},
        {text: '+', key: KEYS.SUBTITLE_DELAY_INC},
  ],
  [
        {text: 'Infos', key: KEYS.INFOS},
        {text: 'Quitter', key: KEYS.QUIT},
  ],
];




/**
 *
 * @param {WebSocket} ws
 * @param {string} address
 * @constructor
 * @extends ./Client
 */
function WSClient(ws, address){
  Client.call(this);
  this.address = address;
  this.id = this.get_id();
  this.ws = ws;
}
nutil.inherits(WSClient, Client);

/**
 *
 * @param {string} action
 * @param {string|Array|Object} data
 * @override
 */
WSClient.prototype.send = function(action, data){
  this.ws.send(util.computePacket(action, data));
};
/**
 * @override
 * @returns {string}
 */
WSClient.prototype.get_id = function(){
  return `${this.address}`;
};

module.exports.WSServer = WSServer;

