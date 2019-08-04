

/**
 * @abstract
 * @class
 * @name Client
 */
function Client(clients){
  this.closed = false;
  this.close_timeout = null;

  this.timeout = +new Date();
}

/**
 *
 * @param {string} action
 * @param {string|Array|Object} data
 */
Client.prototype.send = function(action, data){};

Client.prototype.close = function(){
  this.closed = +new Date();
};

Client.prototype.is_closed = function(){
  return this.closed;
};

/**
 * Refresh the timeout of the client
 */
Client.prototype.ping = function(){
  this.timeout = +new Date();
};

/**
 * @return {string}
 */
Client.prototype.get_id = function(){
  return '';
};

module.exports.Client = Client;
