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

    this.timeout_duration = 600000;

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
        client.closed = false;
        this.update_client_timeout(client);
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
 * @param {string} cKey
 * @param {Client} client
 * @private
 * @return {boolean} true if client was added to the list
 */
Clients.prototype.close_client_ = function(cKey){
    if (this.list.has(cKey)){
        this.list.get(cKey).closed = true;
        return true;
    }
    return false;
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

Clients.prototype.update_clients_timeout = function(timeout){
    this.timeout_duration = timeout + 600000;
    this.list.forEach((client, cKey) => {
        if (!client.closed){
            this.update_client_timeout(client);
        }
    });
};

Clients.prototype.update_client_timeout = function(client){

    if (client.close_timeout !== null){
        clearTimeout(client.close_timeout);
    }
    client.close_timeout = setTimeout(() => {
        this.close_client_(client);
    }, this.timeout_duration);
};

module.exports.Clients = Clients;
