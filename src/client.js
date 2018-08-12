

/**
 * @abstract
 * @class
 * @name Client
 */
function Client(clients){
	this.closed = false;
	this.close_timeout = null;
}

/**
 *
 * @param {string} action
 * @param {string|Array|Object} data
 */
Client.prototype.send = function(action, data){};

Client.prototype.close = function(){
	this.closed = +new Date;
};

Client.prototype.is_closed = function(){
	return this.closed;
};

/**
 * @returns {string}
 */
Client.prototype.get_id = function(){

};

module.exports.Client = Client;