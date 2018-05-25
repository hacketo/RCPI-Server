/**
 * Created by hacketo on 25/05/18.
 */

var dgram = require('dgram'),
    util = require('./util'),
    KEYS = require ('./keys').KEYS,
    KEY_STR = require ('./keys').KEY_STR,
    msgpack = require('msgpack');

function UDPServer(port){
    this.port = port;
}

UDPServer.prototype.init = function(rcpi){

    this.server = dgram.createSocket('udp4');
    var _s = this;

    this.server.on('error', function(err){
        console.log('UDPServer error:\n'+err.stack);
        _s.close();
    });
    this.server.on('message', function(msg, rinfo){

        var m = msgpack.unpack(msg);

        if (!m.length || m.length <= 0){
            return;
        }

        if (m[0] != 4){
            return;
        }

        var key = m[1];

        if ( key === KEYS.PING){
            rcpi.updateMediaCursor();
            _s.send(rinfo.address, KEYS.FINFOS, rcpi.get_play_packet());
        }
        else if (key === KEYS.LIST){
            _s.send(rinfo.address, KEYS.LIST, rcpi.get_available_media());
        }
        else if (key === KEYS.OPEN){
            if (typeof m[2] === 'undefined'){
                console.log('no path specified');
                return;
            }
            rcpi.spawn_omxplayer(m[2], rinfo.address);
        }
        else{
            if (+key === +key) {
                rcpi.send_to_omx(+key, rinfo.address);
            }
        }

        console.log('UDPServer got: '+KEY_STR[key]+' from '+rinfo.address+':'+rinfo.port);
    });

    this.server.on('listening', function(){
        var address = _s.server.address();
        console.log('UDP Server listening on '+address.address+':'+address.port);
    });

    this.server.bind(this.port);
};

UDPServer.prototype.send = function(address, action, data){
    if (this.server !== null) {
        if (typeof action === 'number') {
            var b = [6, action];
            if (typeof data !== 'undefined') {
                b.push(data);
            }
            var p = msgpack.pack(b);
            this.server.send(p, 0, p.length, this.port, address);
        }
    }
};

UDPServer.prototype.close = function(cb){
    this.server.close(cb);
};

module.exports.UDPServer = UDPServer;