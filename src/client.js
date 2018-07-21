

/**
 * @abstract
 * @class
 * @name Client
 */
function Client(){
	this.lastTimePing = +new Date;
	this.closed = false;
}

/**
 *
 * @param {string} action
 * @param {string|Array|Object} data
 */
Client.prototype.send = function(action, data){};

Client.prototype.ping = function(){
	this.lastTimePing = +new Date;
};
Client.prototype.close = function(){
	this.closed = +new Date;
};

Client.prototype.is_closed = function(){
	return this.closed;
};

/**
 * @returns {string}
 */
Client.prototype.get_id = function(){};

module.exports.Client = Client;