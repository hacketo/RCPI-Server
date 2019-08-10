/**
 * @fileoverview
 * Test helper to replace properties and restore them at the end of a test
 *
 *
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
 *
 * @param {object} obj
 * @param {string} property
 * @constructor
 * @class
 */
function PropertyModel(obj, property){

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

  if (this.object_.hasOwnProperty(this.property_)){
    this.setupProperty_();
  }
}

/**
 * Setup the property definition, and overwrite the object one
 * Hook original setter/getter
 * @private
 */
PropertyModel.prototype.setupProperty_ = function(){

  this.value_ = this.object_[this.property_];

  this.origin_ = Object.getOwnPropertyDescriptor(this.object_, this.property_);

  delete this.object_[this.property_];
  Object.defineProperty(this.object_, this.property_, {
    set: (val) => this.setter_(val),
    get: () => this.getter_(),
    configurable: true,
  });

  this.fnProxy_ = undefined;

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
PropertyModel.prototype.setter_ = function(value){
  if (typeof this.replacers_[ReplaceType.SETTER_BEFORE] === 'function'){
    value = this.replacers_[ReplaceType.SETTER_BEFORE].call(this.object_, value);
  }
  if (typeof this.replacers_[ReplaceType.SETTER] === 'function'){
    const r = this.replacers_[ReplaceType.SETTER].call(this.object_, value);
    if (r !== undefined){
      value = r;
    }
  }
  if (typeof this.replacers_[ReplaceType.SETTER_AFTER] === 'function'){
    value = this.replacers_[ReplaceType.SETTER_AFTER].call(this.object_, value);
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
PropertyModel.prototype.getter_ = function(){
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
  return value;
};

/**
 * Set the callack for hook or replace current value
 * @param {ReplaceType} type
 * @param {function()|*} value
 */
PropertyModel.prototype.replace = function(type, value){

  if (!this.initialized_){
    this.setupProperty_();
  }

  const obj = this.object_;

  if (type === ReplaceType.REPLACE){
    this.replacers_ = {};

    if (typeof value === 'function'){
      if (!this.fnProxy_ || this.value_ !== this.fnProxy_){
        this.value_ = value;
      }
    }
    else {
      this.value_ = value;
    }
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
        throw new Error('value must be a function');
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

PropertyModel.prototype.getReplacer_ = function(type){
  if (typeof this.replacers_[type] === 'function'){
    return this.replacers_[type];
  }
  return void 0;
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
PropertyModel.prototype.getFnProxy_ = function(obj, value){

  if (this.fnProxy_){
    return this.fnProxy_;
  }

  const getReplacer_ = this.getReplacer_.bind(this);

  this.fnProxy_ = function(){
    let rValue = Array.prototype.slice.call(arguments);

    const before = getReplacer_(ReplaceType.BEFORE);
    if (before){
      rValue = before.apply(obj, rValue);
    }

    rValue = value.apply(obj, rValue);

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
PropertyModel.prototype.restore = function(){
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


/**
 * Class used to handle property_ replacement in tests
 *
 * @usage:
 *
 *
 * @class
 * @constructor
 */
function PropertyReplacer(){

  /**
   *
   * @type {Map<string, PropertyModel>}
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
 * @param {ReplaceType} type=ReplaceType.REPLACE
 */
PropertyReplacer.prototype.replace = function(object, property, replacer, type){

  const key = this.getKey_(object, property);

  if (!this.properties_.has(key)){
    const propertyModel = new PropertyModel(object, property);
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
  this.properties_.forEach(propertyModel => {
    propertyModel.restore();
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
 *
 * @param {object} object
 * @param {string} property
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

PropertyReplacer.prototype.hasKey_ = function(key){
  return this.properties_.has(key);
};

module.exports = {
  PropertyModel: PropertyModel,
  PropertyReplacer: PropertyReplacer,
  ReplaceType: ReplaceType,
};
