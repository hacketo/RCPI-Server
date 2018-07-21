/**
 * Created by hacketo on 21/07/18.
 */

/**
 * @class
 * @constructor
 */
function Clients(){

    /**
     *
     * @type {Map<string, Client>}
     */
    this.list = new Map();

}

/**
 * @param {Type} cClass
 * @param {WebSocket|Object} rinfo
 */
Clients.prototype.handle_client = function(server, rinfo){

    let client;

    const cKey = server.idFromRInfo(rinfo);

    if (this.list.has(cKey)){
        client = this.list.get(cKey);
    }
    else{
	    client = server.get_client_provider()(rinfo);
	    this.add_client_(cKey, client);
    }

    return client;
};

/**
 *
 * @param {string} cKey
 * @param {Client} client
 * @private
 * @return {boolean} true if client was added to the list
 */
Clients.prototype.add_client_ = function(cKey, client){
    if (this.list.has(cKey)){
        return false;
    }

    this.list.set(cKey, client);
    return true;
};

/**
 *
 * @param {string} action
 * @param {string|Array|Object} data
 */
Clients.prototype.broadcast = function(action, data){
  this.list.forEach((client) => {
     if (!client.closed){
        client.send(action, data);
     }
  });
};

module.exports.Clients = Clients;
