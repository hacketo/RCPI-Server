/**
 * Created by hacketo on 21/07/18.
 */

const util = require('./util');

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

    this.default_timeout_duration = util.sec(300); // 5 mins
    this.timeout_duration = this.default_timeout_duration;
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
    }
    else{
	    client = server.get_client_provider()(rinfo);
	    this.add_client_(cKey, client);
    }
    client.ping();
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
    this.list.forEach((client, cId, list) => {
        if (!client.closed){
            if (+new Date() - client.timeout > this.timeout_duration ){
               this.close_client_(client.get_id());
            }
           client.send(action, data);
        }
    });
};

/**
 * Update the timeout for all the clients
 * @param {Client} client - client that send the cmd
 * @param {number} timeout - time in ms to add to default timeout
 * @param {boolean} sendToAll - true if update the timeout for all clients
 */
Clients.prototype.update_timeout = function(timeout){
    this.timeout_duration = this.default_timeout_duration + timeout;
};

/**
 * Update the timeout for a client
 * @deprecated
 */
Clients.prototype.update_client_timeout = function(client){
    // Client has to be in the list to continue, makes no sense
    if (this.list.indexOf(client) == -1 || client.closed){
        return;
    }

    if (client.close_timeout !== null){
        clearTimeout(client.close_timeout);
    }
    client.close_timeout = setTimeout(() => {
        this.close_client_(client);
    }, this.timeout_duration);
};

module.exports.Clients = Clients;
