const pHash = '_$_$_hash';

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
   * Contain the current mocked value of the object
   * @type {*}
   * @private
   */
  this.value_ = undefined;

  /**
   * Store all the function used to hook the getter and setter, the call before / after
   * @type {object}
   * @private
   */
  this.replacers_ = {};

  this.setupProperty_();
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

  if (typeof this.origin_.get === 'function'){
    this.observe(PropertyReplacer.TYPE.GETTER, this.origin_.get);
  }
  if (typeof this.origin_.set === 'function'){
    this.observe(PropertyReplacer.TYPE.SETTER, this.origin_.set);
  }

  this.fnProxy_ = undefined;
};

/**
 * Call the setter sequence if any:
 * set_before(val) -> set -> set_after
 * update the this.value_
 * @param {*} value
 * @private
 */
PropertyModel.prototype.setter_ = function(value){
  if (typeof this.replacers_[PropertyReplacer.TYPE.SETTER_BEFORE] === 'function'){
    value = this.replacers_[PropertyReplacer.TYPE.SETTER_BEFORE].call(this.object_, value);
  }
  if (typeof this.replacers_[PropertyReplacer.TYPE.SETTER] === 'function'){
    value = this.replacers_[PropertyReplacer.TYPE.SETTER].call(this.object_, value);
  }
  if (typeof this.replacers_[PropertyReplacer.TYPE.SETTER_AFTER] === 'function'){
    value = this.replacers_[PropertyReplacer.TYPE.SETTER_AFTER].call(this.object_, value);
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
  if (typeof this.replacers_[PropertyReplacer.TYPE.GETTER_BEFORE] === 'function'){
    value = this.replacers_[PropertyReplacer.TYPE.GETTER_BEFORE].call(this.object_);
  }
  if (typeof this.replacers_[PropertyReplacer.TYPE.GETTER] === 'function'){
    value = this.replacers_[PropertyReplacer.TYPE.GETTER].call(this.object_);
  }
  if (typeof this.replacers_[PropertyReplacer.TYPE.GETTER_AFTER] === 'function'){
    value = this.replacers_[PropertyReplacer.TYPE.GETTER_AFTER].call(this.object_, value);
  }
  return value;
};

/**
 * Set the callack for hook or replace current value
 * @param {PropertyReplacer.TYPE} type
 * @param {function()|*} value
 */
PropertyModel.prototype.observe = function(type, value){

  const obj = this.object_;

  if (type === PropertyReplacer.TYPE.REPLACE){
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
    case PropertyReplacer.TYPE.GETTER_BEFORE:
    case PropertyReplacer.TYPE.GETTER:
    case PropertyReplacer.TYPE.GETTER_AFTER:
    case PropertyReplacer.TYPE.SETTER_BEFORE:
    case PropertyReplacer.TYPE.SETTER:
    case PropertyReplacer.TYPE.SETTER_AFTER:
      if (typeof value !== 'function'){
        throw new Error('value must be a function');
      }
      this.replacers_[type] = value;
      break;

      // BEFORE and AFTER replacer should update the current value to fnProxy if not already
    case PropertyReplacer.TYPE.BEFORE:
    case PropertyReplacer.TYPE.AFTER:

      if (typeof value !== 'function'){
        throw new Error('value must be a function');
      }

      this.replacers_[type] = value;

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

    const before = getReplacer_(PropertyReplacer.TYPE.BEFORE);
    if (before){
      rValue = before.apply(obj, rValue);
    }

    rValue = value.apply(obj, rValue);

    const after = getReplacer_(PropertyReplacer.TYPE.AFTER);
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
  Object.defineProperty(this.object_, this.property_, this.origin_);

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
 * @enum {number}
 */
PropertyReplacer.TYPE = {
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
 * Replace a property_ with a replacer, usefull for mitm functions
 * @param {object} object
 * @param {string} property
 * @param {*} replacer
 * @param {PropertyReplacer.TYPE} type=PropertyReplacer.TYPE.REPLACE
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
    type = PropertyReplacer.TYPE.REPLACE;
  }

  original.observe(type, replacer);
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
 * REturn a unique has for an object_
 * @param {object} object
 * @param {boolean=} create=true
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

  if (!(property in object)){
    throw new Error('Object dont have property_ :' + property);
  }

  const hash = this.getHash_(object, create);

  if (!hash){
    throw new Error('canfind a hash for ' + object);
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
};
