/**
 * Created by hacketo on 25/05/18.
 */
const nutil = require('util');
const dgram = require('dgram');
const util = require('./util');
const KEYS = require('./keys').KEYS;
const KEY_STR = require('./keys').KEY_STR;
const msgpack = require('msgpack-lite');
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
    util.error(`UDPServer error:\n${err.stack}`);
    this.close(function(errCode){
      util.error(`closed server code : ${errCode}`);
    });
  });

  this.server.on('message', (msg, rinfo) => {
    const client = this.clients.handle_client(this, rinfo);

    const m = msgpack.decode(msg);
        // Check msg structure
    if (!m.length || m.length <= 0){ return; }

        // Message starts with 4
    if (m[0] != 4){ return; }

    const key = m[1];

    if (typeof KEY_STR[key] === 'string'){
      util.log(`UDPServer got: ${KEY_STR[key]} from ${rinfo.address}:${rinfo.port}`);
    }

    // check KEY
    switch (key){
      case KEYS.PING:
        rcpi.onPING(client);
        break;
      case KEYS.LIST:
        rcpi.onLIST(client);
        break;
      case KEYS.DL:
        rcpi.onDOWNLOAD(client, m[2]);
        break;
      case KEYS.OPEN:
        rcpi.onOPEN(client, m[2], m[3]);
        break;
      case KEYS.DEBUG:
        rcpi.onDEBUG(client, m[2]);
        break;
      default:
        if (+key === +key) {
          rcpi.send_to_omx(client, +key);
        }
    }
  });

  this.server.on('listening', () => {
    const address = this.server.address();
    util.log(`UDP Server listening on ${address.address}:${address.port}`);
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
      const b = [6, action];
      if (typeof data !== 'undefined') {
        b.push(data);
      }
      const p = msgpack.encode(b);
      util.log('Sending UDP : ', action, JSON.stringify(data), this.port, address);
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
  return `$${rinfo.address}`;
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
  this.id = UDPServer.prototype.idFromRInfo(rinfo);
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
  return this.id;
};


module.exports.UDPServer = UDPServer;
