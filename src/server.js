/**
 * Created by hacketo on 17/07/17.
 */

(function() {

    var fs = require('fs'), 
		Omx = require('./mock.js'),
		//Omx = require('node-omxplayer'),
	 	http = require('http'),
		textEncoding = require('text-encoding'),
	    getDuration = require('get-video-duration'),
		TextDecoder = textEncoding.TextDecoder,
	    youtubedl = require('youtube-dl');


    var ws_port = 9877;
    var udp_port = 9878;
	var USE_WS = false;
	var isFilmPlaying = false;
	var lastCheck = 0;

	var currentFilmDuration_ = -1;
	var currentFilmCursor_ = 0;

    var wsServer = null, udpServer = null, omx_player = null;
	var KEYS = {
		PLAY : 1,
		/*FULLSCREEN : 2,
		HUD : 3,*/
		PLAYBACK_BACKWARD600 : 4,
		PLAYBACK_BACKWARD30 : 5,
		PLAYBACK_FORWARD30 : 6,
		PLAYBACK_FORWARD600 : 7,
		AUDIO_TRACK_NEXT : 8,
		AUDIO_TRACK_PREV : 9,
		AUDIO_VOL_UP : 10,
		AUDIO_VOL_DOWN : 11,
		SUBTITLE_TOGGLE : 12,
		SUBTITLE_TRACK_NEXT : 13,
		SUBTITLE_TRACK_PREV : 14,
		SUBTITLE_DELAY_DEC : 15,
		SUBTITLE_DELAY_INC : 16,
		INFOS : 17,
		QUIT : 18
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

	function sec(ms_){
		return ms_ * 1000;
	}


	function sendUdp(action, data, address){
		var p = get_packet(action, data);
		if (udpServer !== null){
			udpServer.send( p, 0, Buffer.byteLength(p), udp_port, address);
			console.log("sending "+action, data, "on "+address+":"+udp_port);
		}
	}

	function sendTo(receiver, action, data){
		if (typeof receiver === "string"){
			sendUdp(action, data, receiver);

		}
		else{
			if (typeof receiver !== 'undefined' && wsServer !== null) {
				receiver.send(get_packet(action, data));
			}
		}

	}

	function exitHandler(options, err) {
		if (err) {
			console.log(err.stack);
		}
		if (options.exit) {
			if (omx_player != null){
				omx_player.quit();
			}
			if (wsServer !== null) {
				wsServer.close(function () {
					console.log('WSServer closed!');
					process.exit(); // should call exitHandler with cleanup
				});
			}
			if (udpServer !== null) {
				udpServer.close(function () {
					console.log('UDPServer closed!');
				});
			}
		}
	}

	var dgram = require('dgram');
	udpServer = dgram.createSocket('udp4');
	udpServer.on('error', function(err){
		console.log('UDPServer error:\n'+err.stack);
		udpServer.close();
	});
	udpServer.on('message', function(msg, rinfo){
		console.log('UDPServer got: '+msg+' from '+rinfo.address+':'+rinfo.port);
		var str = new TextDecoder("utf-8").decode(msg);
		if (str.lastIndexOf('$', 0) === 0 ){
			var key = str.substr(1);
			if (key.length > 0 && +key === +key) {
				send_omx(+key, rinfo.address);
			}
		}
		else{
			if (str === 'reload'){
				sendUdp('list', get_films_availables(), rinfo.address);
			}
			else if (str === 'ping'){
				updateFilmCursor();
				sendUdp('finfos', {action:isFilmPlaying ? "play" : "stop",duration:currentFilmDuration_, cursor:currentFilmCursor_}, rinfo.address);
			}
			else if (str.lastIndexOf('open',0) === 0){
				var d = str.substring(5);
				spawn_omxplayer(d, rinfo.address);
			}
		}
	});
	udpServer.on('listening', function(){
		var address = udpServer.address();
		console.log('UDP Server listening on '+address.address+':'+address.port);
	});
	udpServer.bind(udp_port);

	process.on('exit', exitHandler.bind(null, {
		cleanup: true
	}));
	//catches ctrl+c event
	process.on('SIGINT', exitHandler.bind(null, {
		exit: true,
		cleanup: true
	}));
	//catches uncaught exceptions
	process.on('uncaughtException', exitHandler.bind(null, {
		exit: true
	}));


	if (USE_WS){

		function get_ws_server(port) {
			var WebSocketServer = require('ws').Server;
			var processRequest = function(req, res) {
			};
			var app = http.createServer(processRequest).listen(port);

			return new WebSocketServer({
				server: app,
				clientTracking: true,
				verifyClient: function(){return true;}
			});
		}

		wsServer = get_ws_server(ws_port);
	 	wsServer.on('connection', function(ws) {
	 		//on_new_connection

			var data = {
				keys : remote,
				films : get_films_availables()
			};
			console.log('new client');
			ws.send(get_packet('init', data));

	 		ws.on('message', function(msg) {
				var data = JSON.parse(msg);
				console.log(data);
				if (data.key === 'open'){
					if (typeof data.film === 'string' ){
						spawn_omxplayer(data.film, ws);
					}
				}
				else if (data.key === 'reload'){
					ws.send(get_packet('reload', get_films_availables()));
				}
				else{
					send_omx(data.key, ws);
				}
	 		});
	 		ws.once('close', function(code, message) {
	 			console.log('client closed '+code+' : '+message);
	 		});
	 	});
	}

    function send_omx(key, receiver){
        if (omx_player != null && omx_player.running){
            switch(key){
				case KEYS.PLAY:
					playPauseCursor();
					omx_player.play();
					sendTo(receiver, 'finfos', {action:isFilmPlaying ? 'play' : 'stop', cursor:currentFilmCursor_});
					break;
				case KEYS.FULLSCREEN:
					break;
				case KEYS.HUD:
					break;
				case KEYS.PLAYBACK_BACKWARD600:
					updateFilmCursor();
					moveCursor(sec(-600));
					omx_player.back600();
					sendTo(receiver, 'finfos', {cursor:currentFilmCursor_});
					break;
				case KEYS.PLAYBACK_BACKWARD30:
					updateFilmCursor();
					moveCursor(sec(-30));
					omx_player.back30();
					sendTo(receiver, 'finfos', {cursor:currentFilmCursor_});
					break;
				case KEYS.PLAYBACK_FORWARD30:
					updateFilmCursor();
					moveCursor(sec(30));
					omx_player.fwd30();
					sendTo(receiver, 'finfos', {cursor:currentFilmCursor_});
					break;
				case KEYS.PLAYBACK_FORWARD600:
					updateFilmCursor();
					moveCursor(sec(600));
					omx_player.fwd600();
					sendTo(receiver, 'finfos', {cursor:currentFilmCursor_});
					break;
				case KEYS.AUDIO_TRACK_NEXT:
					omx_player.nextAudio();
					break;
				case KEYS.AUDIO_TRACK_PREV:
					omx_player.prevAudio();
					break;
				case KEYS.AUDIO_VOL_UP:
					omx_player.volUp();
					break;
				case KEYS.AUDIO_VOL_DOWN:
					omx_player.volDown();
					break;
				case KEYS.SUBTITLE_TOGGLE:
					omx_player.subtitles();
					break;
				case KEYS.SUBTITLE_TRACK_NEXT:
					omx_player.nextSubtitle();
					break;
				case KEYS.SUBTITLE_TRACK_PREV:
					omx_player.prevSubtitle();
					break;
				case KEYS.SUBTITLE_DELAY_DEC:
					omx_player.decSubDelay();
					break;
				case KEYS.SUBTITLE_DELAY_INC:
					omx_player.incSubDelay();
					break;
				case KEYS.QUIT:
					omx_player.quit();
					break;
				case KEYS.INFOS:
					omx_player.info();
					break;
				default:
					console.log('key not found '+key);
					break;
			}
        }
    }

    var folder = '/media/pi';

    function get_films_availables(){
        if (fs.existsSync(folder)){
            return walk(folder);
        }
        return ["a","b"];
    }
	
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

	function resetFilmCursor(){
		currentFilmCursor_ = 0;
		isFilmPlaying = true;
		lastCheck = +new Date();
	}


	function playPauseCursor(){
		updateFilmCursor();
		isFilmPlaying = !isFilmPlaying;

	}
	function updateFilmCursor(){
		if (isFilmPlaying) {
			moveCursor(+new Date() - lastCheck);
		}
		lastCheck = +new Date();
	}

	function moveCursor(d){
		if (currentFilmCursor_ + d > currentFilmDuration_){
			currentFilmCursor_ = currentFilmDuration_
		}
		else if (currentFilmCursor_ + d < 0){
			currentFilmCursor_ = 0
		}
		else {
			currentFilmCursor_ = currentFilmCursor_ + d;
		}
	}

	function spawn_ (film, receiver){
		getDuration(film).then(function(duration){
			console.log('lancement '+film+' durée '+duration);
			currentFilmDuration_ = duration * 1000;
			if (omx_player == null){
				omx_player = Omx(film, 'hdmi', false, -500);
			}
			else{
				omx_player.newSource(film, 'hdmi', false, -500);
			}
			resetFilmCursor();
			sendTo(receiver, 'finfos', {action:"play",duration:currentFilmDuration_, cursor:currentFilmCursor_});
		}, function(error){
			console.log(error);
		});
	}

    function spawn_omxplayer(film, receiver){
    	if (film.startsWith('https://youtu') || film.startsWith('http://youtu')){
			youtubedl.getInfo(film, [], function(err, info) {
				if (err) throw err;
				spawn_(info.url,receiver);
			});
		}
		else{
			spawn_(film,receiver);
		}
    }

	function get_packet(action, data){
		return JSON.stringify({action:action, data:data});
	}

	if (USE_WS) {
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

		console.log("listening on port " + port)

	}
})();