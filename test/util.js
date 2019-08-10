/**
 * @fileoverview
 * Test helper to replace properties and restore them at the end of a test
 *
 * The PropertyReplacer is a test helper to replace object properties.
 * It helps in restoring the original state of the property with a simple restore() method
 *
 *
 */


/**
 * Property name used to store the unique id for a model
 * @const
 * @type {string}
 */
const pHash = '_$_$_hash';

/**
 * @enum {number}
 */
const ReplaceType = {
  BEFORE: 0,
  REPLACE: 1,
  AFTER: 2,
  GETTER_BEFORE: 3,
  GETTER: 4,
  GETTER_AFTER: 5,
  SETTER_BEFORE: 6,
  SETTER: 7,
  SETTER_AFTER: 8,
};

/**
 * Helper class to replace properties and restore them at the end of a test
 *
 * @usage:
 *<pre>
 *  const replacer = new PropertyReplacer();
 *
 *  before() {
 *    replacer.replace(Math, 'random', function() {
 *      return 4;  // pure random.
 *    });
 *  },
 *
 *  testRandomness(){
 *    assertEquals(4, Math.random());
 *  },
 *
 *  after(){
 *    replacer.restore(Math, 'random');
 *    //replacer.restoreAll();
 *  }
 *</pre>
 *
 *
 * Instead of replacing the property you can proxy the function itself
 *
 * BEFORE : called before the function,
 * args : forwarded
 * rValue : list of function args
 *
 * @example :
 *   <pre>
 *      replacer.replace(console, 'log', function(msg) {
 *        return "haha";
 *      }, ReplaceType.BEFORE);
 *
 *      console.log('something'); // logs haha
 *
 *   </pre>
 *
 *
 * REPLACE: called instead of the original function,
 *
 * AFTER : called after the original function
 * args : forwarded
 * rValue : list of function args
 *
 * @example :
 *   <pre>
 *      replacer.replace(Number.prototype, 'toString', function(a) {
 *        if (a === '0'){
 *          return "haha";
 *        }
 *        return a
 *      }, ReplaceType.AFTER);
 *
 *      let a = 0;
 *
 *      console.log(a+''); // logs haha
 *
 *   </pre>
 *
 *
 * Or proxy the setter/getter of the property
 *
 * SETTER_BEFORE : called before the original SETTER, with the same arguments
 * args : forwarded
 * rValue : will be the one given to the SETTER function
 *
 * @example :
 *   <pre>
 *
 *      let originalFn = console.log;
 *
 *      replacer.replace(console, 'log', function(a) {
 *        return originalFn;
 *      }, ReplaceType.SETTER_BEFORE);
 *
 *      console.log = 0;
 *
 *      console.log('haha'); // logs haha
 *
 *   </pre>
 *
 * SETTER : called instead of the original SETTER
 * args : forwarded
 * rValue : will be the one given to the SETTER_AFTER
 *
 * @example :
 *   <pre>
 *
 *      let originalFn = console.log;
 *
 *      replacer.replace(console, 'log', function(a) {
 *        return originalFn;
 *      }, ReplaceType.SETTER);
 *
 *      console.log = 0;
 *
 *      console.log('haha'); // logs haha
 *
 *   </pre>
 *
 * SETTER_AFTER : called after the SETTER function
 * args : forwarded
 * rValue : will be the one stored as this.value_
 *
 * @example :
 *   <pre>
 *
 *      let originalFn = console.log;
 *
 *      replacer.replace(console, 'log', function(a) {
 *        return originalFn;
 *      }, ReplaceType.SETTER_AFTER);
 *
 *      console.log = 0;
 *
 *      console.log('haha'); // logs haha
 *
 *   </pre>
 *
 *
 * GETTER_BEFORE : called before the original GETTER,
 * args : internal value stored,
 * rValue : no used
 *
 * GETTER : called instead of the original GETTER
 * args : none,
 * rValue : will be the one given to the GETTER_AFTER
 *
 * GETTER_AFTER : called after the GETTER function
 * args : GETTER rValue,
 * rValue : will be the one given to the SETTER_AFTER
 *
 * @TODO: restore properties by object, remove default hash property on mocked objects
 *
 * @class
 * @constructor
 */
function PropertyReplacer(){

  /**
   * contain the list of all the properties replaced
   * @type {Map<string, PropertyStub>}
   * @private
   */
  this.properties_ = new Map();

  /**
   * property name used to store it's id
   * @type {string}
   * @private
   */
  this.hash_ = pHash;

  this.nId = 0;
}


/**
 * Replace a property_ with a replacer, usefull for mitm functions
 * @param {object} object
 * @param {string} property
 * @param {*} replacer
 * @param {ReplaceType=} type=ReplaceType.REPLACE
 */
PropertyReplacer.prototype.replace = function(object, property, replacer, type){

  const key = this.getKey_(object, property);

  if (!this.properties_.has(key)){
    const propertyModel = new PropertyStub(object, property);
    this.properties_.set(key, propertyModel);
  }

  const original = this.properties_.get(key);

  // Default type to REPLACE
  if (typeof type === 'undefined'){
    type = ReplaceType.REPLACE;
  }

  original.replace(type, replacer);
};

/**
 * Restore the original value for a field in a object_
 * @param {object} object
 * @param {string} property
 * @return {boolean}
 */
PropertyReplacer.prototype.restore = function(object, property){
  const key = this.getKey_(object, property, false);
  if (this.hasKey_(key)){
    const model = this.properties_.get(key);
    model.restore();
    return this.properties_.delete(key);
  }
  return false;
};

/**
 * Restore ALL the original values for ALL field in ALL object_
 */
PropertyReplacer.prototype.restoreAll = function(){
  this.properties_.forEach(propertyStub => {
    propertyStub.restore();
  });
  this.properties_.clear();
};

/**
 * Return a unique has for an object
 * @param {object} object
 * @param {boolean=} create=true - if true, create the hash for the object
 * @return {string}
 * @private
 */
PropertyReplacer.prototype.getHash_ = function(object, create){

  if (create === undefined){
    create = true;
  }

  if (!object[this.hash_]){
    if (!create){
      throw new Error('hash does not exists for object_ ' + object);
    }
    object[this.hash_] = ++this.nId;
  }

  return object[this.hash_];
};

/**
 * Retrieve a unique key for the combination of the object and the property name
 * if the create flag is supplied to false, it will only retrieve an existing computed key
 * @param {object} object
 * @param {string} property - the property name
 * @param {boolean=} create=true
 * @return {string}
 * @private
 */
PropertyReplacer.prototype.getKey_ = function(object, property, create){

  if (create === undefined){
    create = true;
  }

  if (typeof property !== 'string'){
    throw new Error('property_ has to be a string');
  }

  if (!object.hasOwnProperty(property)){
    throw new Error('Object dont have property :' + property);
  }

  const hash = this.getHash_(object, create);

  if (!hash){
    throw new Error('can\'t find a hash for ' + object);
  }

  const key = hash + ':' + property;

  if (!create && !this.hasKey_(key)){
    throw new Error('key [' + key + ']does not exists for object_ ' + object);
  }

  return key;
};

/**
 * Test if the key is known in the properties_ list
 * @param {string} key
 * @return {boolean}
 * @private
 */
PropertyReplacer.prototype.hasKey_ = function(key){
  return this.properties_.has(key);
};

/**
 * Class to handle the replacement/restore of the value
 *
 * @param {object} obj
 * @param {string} property
 * @constructor
 * @class
 */
function PropertyStub(obj, property){

  /**
   * Reference to the object
   * @type {object}
   * @private
   */
  this.object_ = obj;

  /**
   * Property name
   * @type {string}
   * @private
   */
  this.property_ = property;

  /**
   * Store the original property descriptor of the object
   * @type {PropertyDescriptor}
   * @private
   */
  this.origin_ = undefined;

  /**
   * Store all the function used to hook the getter and setter, the call before / after
   * @type {object}
   * @private
   */
  this.replacers_ = {};

  /**
   * Contain the current mocked value of the object
   * @type {*}
   * @private
   */
  this.value_ = undefined;

  /**
   * internal flag to call {@see #setupProperty_}
   * @type {boolean}
   */
  this.initialized_ = false;

  /**
   * Function proxy used for the BEFORE and AFTER stub
   * @type {function()}
   * @private
   */
  this.fnProxy_ = undefined;

  if (this.object_.hasOwnProperty(this.property_)){
    this.setupProperty_();
  }
}

/**
 * Setup the property definition, and overwrite the object one
 * Hook original setter/getter
 * @private
 */
PropertyStub.prototype.setupProperty_ = function(){

  this.value_ = this.object_[this.property_];

  this.origin_ = Object.getOwnPropertyDescriptor(this.object_, this.property_);

  delete this.object_[this.property_];
  Object.defineProperty(this.object_, this.property_, {
    set: (function(model){
      return function(val){
        return model.setter_.apply(model, arguments);
      };
    })(this),
    get: () => this.getter_(),
    configurable: true,
  });

  // need to update the initialized flag here to be able to replace the setter/getter if any
  this.initialized_ = true;

  if (this.origin_){
    if (typeof this.origin_.get === 'function'){
      this.replace(ReplaceType.GETTER, this.origin_.get);
    }
    if (typeof this.origin_.set === 'function'){
      this.replace(ReplaceType.SETTER, this.origin_.set);
    }
  }


};

/**
 * Call the setter sequence if any:
 * set_before(val) -> set -> set_after
 * update the this.value_
 * @param {*} value
 * @private
 */
PropertyStub.prototype.setter_ = function(value){
  if (typeof this.replacers_[ReplaceType.SETTER_BEFORE] === 'function'){
    value = this.replacers_[ReplaceType.SETTER_BEFORE].apply(this.object_, arguments);
  }
  if (typeof this.replacers_[ReplaceType.SETTER] === 'function'){
    const r = this.replacers_[ReplaceType.SETTER].apply(this.object_, arguments);
    if (r !== undefined){
      value = r;
    }
  }
  if (typeof this.replacers_[ReplaceType.SETTER_AFTER] === 'function'){
    value = this.replacers_[ReplaceType.SETTER_AFTER].apply(this.object_, arguments);
  }

  this.value_ = value;
};

/**
 *
 * Call the getter sequence if any:
 * get_before
 * get
 * get_after
 * @return {*}
 * @private
 */
PropertyStub.prototype.getter_ = function(){
  let value = this.value_;
  // Should get_before have access to the value ? the real getter will not use any value
  if (typeof this.replacers_[ReplaceType.GETTER_BEFORE] === 'function'){
    value = this.replacers_[ReplaceType.GETTER_BEFORE].call(this.object_);
  }
  if (typeof this.replacers_[ReplaceType.GETTER] === 'function'){
    value = this.replacers_[ReplaceType.GETTER].call(this.object_);
  }
  if (typeof this.replacers_[ReplaceType.GETTER_AFTER] === 'function'){
    value = this.replacers_[ReplaceType.GETTER_AFTER].call(this.object_, value);
  }
  //TODO-tt should GETTER override this.value_ ?
  return value;
};

/**
 * Set the callack for hook or replace current value
 * @param {ReplaceType} type
 * @param {function()|*} value
 */
PropertyStub.prototype.replace = function(type, value){

  if (!this.initialized_){
    this.setupProperty_();
  }

  const obj = this.object_;

  if (type === ReplaceType.REPLACE){
    // Remove all replacers
    this.replacers_ = {};

    // if (typeof value === 'function'){
    //   if (!this.fnProxy_ || this.value_ !== this.fnProxy_){
    //     this.value_ = value;
    //   }
    // }
    // else {
    this.value_ = value;
    // }
    return;
  }

  switch (type) {
    case ReplaceType.GETTER_BEFORE:
    case ReplaceType.GETTER:
    case ReplaceType.GETTER_AFTER:
    case ReplaceType.SETTER_BEFORE:
    case ReplaceType.SETTER:
    case ReplaceType.SETTER_AFTER:

      if (typeof value !== 'function'){
        throw new Error('value must be a function, yet..');
      }

      this.replacers_[type] = value;
      break;

      // BEFORE and AFTER replacer should update the current value to fnProxy if not already
    case ReplaceType.BEFORE:
    case ReplaceType.AFTER:

      if (typeof value !== 'function'){
        throw new Error('value must be a function');
      }

      this.replacers_[type] = value;

      //Only set the proxy if not already equal to, will call the setter
      if (!this.fnProxy_ || this.value_ !== this.fnProxy_){
        this.setter_(this.getFnProxy_(obj, this.value_));
      }
      break;

    default:
      throw new Error('Unkown type : ' + type + ' for callable');
  }
};

/**
 * Initialize a new function proxy, to be able to call the BEFORE / AFTER hooks
 * Store the result in {@see this.fnProxy_}
 *
 * @param {object} obj - the object to set the proxy value on
 * @param {function} value - the actual current value
 * @return {function}
 * @private
 */
PropertyStub.prototype.getFnProxy_ = function(obj, value){

  if (this.fnProxy_){
    return this.fnProxy_;
  }

  // Local method to retrieve the replacer inside the function proxy
  const getReplacer_ = (type) => {
    if (typeof this.replacers_[type] === 'function'){
      return this.replacers_[type];
    }
    return null;
  };

  this.fnProxy_ = function(){
    let rValue = Array.prototype.slice.call(arguments);

    // Call the BEFORE proxy
    const before = getReplacer_(ReplaceType.BEFORE);
    if (before){
      rValue = before.apply(obj, rValue);
    }

    // Call the actual function
    rValue = value.apply(obj, rValue);

    // Call the AFTER proxy
    const after = getReplacer_(ReplaceType.AFTER);
    if (after){
      rValue = after.apply(obj, [rValue]);
    }

    return rValue;
  };

  return this.fnProxy_;
};

/**
 * Reset the value of the object
 * Clean any reference to that object
 * A restore is supposed be called before the destroy of that model
 */
PropertyStub.prototype.restore = function(){
  delete this.object_[this.property_];
  if (this.origin_){
    Object.defineProperty(this.object_, this.property_, this.origin_);
  }
  // Clean references
  this.object_ = null;
  this.property_ = null;
  this.origin_ = null;
  this.value_ = null;

};

module.exports = {
  PropertyStub: PropertyStub,
  PropertyReplacer: PropertyReplacer,
  ReplaceType: ReplaceType,
};
