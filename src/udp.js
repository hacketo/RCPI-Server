/**
 * Created by hacketo on 25/05/18.
 */

var dgram = require('dgram'),
    util = require('./util'),
    TextDecoder = require('text-encoding').TextDecoder;

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
        console.log('UDPServer got: '+msg+' from '+rinfo.address+':'+rinfo.port);
        var str = new TextDecoder("utf-8").decode(msg);
        if (str.lastIndexOf('$', 0) === 0 ){
            var key = str.substr(1);
            if (key.length > 0 && +key === +key) {
                rcpi.send_to_omx(+key, rinfo.address);
            }
        }
        else{
            if (str === 'reload'){
                _s.send('list', rcpi.get_available_media(), rinfo.address);
            }
            else if (str === 'ping'){
                rcpi.updateFilmCursor();
                _s.send('finfos', rcpi.get_play_packet(), rinfo.address);
            }
            else if (str.lastIndexOf('open',0) === 0){
                var d = str.substring(5);
                rcpi.spawn_omxplayer(d, rinfo.address);
            }
        }
    });
    this.server.on('listening', function(){
        var address = _s.server.address();
        console.log('UDP Server listening on '+address.address+':'+address.port);
    });
    this.server.bind(this.port);
};

UDPServer.prototype.send = function(action, data, address){
    var p = util.computePacket(action, data);
    if (this.server !== null){
        this.server.send( p, 0, Buffer.byteLength(p), this.port, address);
        console.log("sending "+action, data, "on "+address+":"+this.port);
    }
};
UDPServer.prototype.close = function(cb){
    this.server.close(cb);
};

module.exports.UDPServer = UDPServer;