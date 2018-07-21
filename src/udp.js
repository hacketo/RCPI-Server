/**
 * Created by hacketo on 25/05/18.
 */
const nutil = require('util');
const dgram = require('dgram');
const util = require('./util');
const KEYS = require ('./keys').KEYS;
const KEY_STR = require ('./keys').KEY_STR;
const msgpack = require('msgpack');
const Client = require('./client').Client;

/**
 *
 * @param {Clients} clients
 * @param {number} port
 * @constructor
 */
function UDPServer(clients, port){
    this.port = port;
    this.clients = clients;
}

UDPServer.prototype.get_client_provider = function(){
	return rinfo => {
		return new UDPClient(this, rinfo);
	};
};

/**
 *
 * @param {RCPI} rcpi
 */
UDPServer.prototype.init = function(rcpi){

    this.server = dgram.createSocket('udp4');

    this.server.on('error', err => {
        console.log('UDPServer error:\n'+err.stack);
        this.close(function(errCode){
        	console.log('closed server code : '+errCode);
        });
    });

    this.server.on('message', (msg, rinfo) => {
	    let client = this.clients.handle_client(this, rinfo);

        const m = msgpack.unpack(msg);
        // Check msg structure
        if (!m.length || m.length <= 0){ return; }
        if (m[0] != 4){ return; }

        const key = m[1];

        if (typeof KEY_STR[key] === 'string'){
	        console.log('UDPServer got: '+KEY_STR[key]+' from '+rinfo.address+':'+rinfo.port);
        }

	    // chekc KEY
        switch(key){
	        case KEYS.PING:
	            rcpi.updateMediaCursor();
		        client.send(KEYS.FINFOS, rcpi.get_play_packet());
	            break;

	        case KEYS.LIST:
		        client.send(KEYS.LIST, rcpi.get_available_media());
	            break;

	        case KEYS.OPEN:
		        const path = m[2];
	            if (typeof path === 'undefined'){
	                console.log('no path specified');
	                return;
	            }
	            console.log('path : '+path);
	            rcpi.spawn_omxplayer(path);
				break;

			default:
	            if (+key === +key) {
	                rcpi.send_to_omx(+key);
	            }
        }

    });

    this.server.on('listening', () => {
        const address = this.server.address();
        console.log('UDP Server listening on '+address.address+':'+address.port);
    });

    this.server.bind(this.port);
};

/**
 *
 * @param {string} address
 * @param {string} action
 * @param {string|Array|Object} data
 */
UDPServer.prototype.send = function(address, action, data){
    if (this.server !== null) {
        if (typeof action === 'number') {
            let b = [6, action];
            if (typeof data !== 'undefined') {
                b.push(data);
            }
            const p = msgpack.pack(b);
            console.log("Sending UDP : ",action, JSON.stringify(data), this.port, address);
            this.server.send(p, 0, p.length, this.port, address);
        }
    }
};

/**
 *
 * @param {function(errCode)} cb
 */
UDPServer.prototype.close = function(cb){
    this.server.close(cb);
};

UDPServer.prototype.idFromRInfo = function(rinfo){
	return "$"+rinfo.address+":"+rinfo.port;
};

/**
 *
 * @param {UDPServer} udpServer
 * @param {{address:string, port:number}} rinfo
 * @constructor
 * @extends ./Client
 */
function UDPClient(udpServer, rinfo){
	Client.call(this);

	this.address = rinfo.address;
	this.port = rinfo.port;
	this.id = this.get_id();
	this.udpServer = udpServer;
}

nutil.inherits(UDPClient, Client);

/**
 *
 * @param {string} action
 * @param {string|Array|Object} data
 */
UDPClient.prototype.send = function(action, data){
	this.udpServer.send(this.address, action, data);
};

/**
 * @override
 * @returns {string}
 */
UDPClient.prototype.get_id = function(){
	return "$"+this.address+":"+this.port;
};


module.exports.UDPServer = UDPServer;