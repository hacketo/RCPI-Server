/**
 * @fileoverview
 * Test helper to replace properties and restore them at the end of a test
 *
 * The PropertyReplacer is a test helper to replace object properties.
 * It helps in restoring the original state of the property with a simple restore() method
 *
 * Ideas:
 * The goal is to easily restore property states between each tests / test suites.
 *
 * You might want to restore all properties on only one specific object
 * ~~You might want to restore some properties only on one object~~
 * You might want to restore all properties changed in that test suite
 * You might want to restore all properties at time T ? (save state)
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
   * Contain the list of namespace defined with all their associated stubs
   * @type {Map<string, Array<PropertyStub>>}
   * @private
   */
  this.namespaces_ = new Map();

  /**
   * Contain a map of all properties for a particular object id
   * @type {Map<string, Array<PropertyStub>>}
   * @private
   */
  this.objects_ = new Map();

  /**
   * property name used to store it's id
   * @type {string}
   * @private
   */
  this.hash_ = pHash;

  this.nId = 0;

  this.currentNamespace_ = '';

  this.namespacesPath_ = [this.currentNamespace_];
}

/**
 * Define the current namespace to use for the replacers
 * Initialize the property stub reference list
 * @param {string} namespace - the namespace to use
 */
PropertyReplacer.prototype.setup = function(namespace){

  this.currentNamespace_ = namespace;

  if (this.currentNamespace_){
    // Initialize namespace list
    if (!this.namespaces_.has(this.currentNamespace_)){
      this.namespaces_.set(this.currentNamespace_, []);
      this.namespacesPath_.push(this.currentNamespace_);
    }
  }
};

/**
 * Replace a property with a replacer, usefull for mitm functions
 * @param {object} object - the object to replace the property
 * @param {string} property - the property to replace on
 * @param {*} replacer - the actual value for the replacement
 * @param {ReplaceType=} type=ReplaceType.REPLACE
 */
PropertyReplacer.prototype.replace = function(object, property, replacer, type){

  const key = this.getKey_(object, property);

  if (!this.properties_.has(key)){
    const propertyStub = new PropertyStub(object, property, key, this.currentNamespace_);
    this.properties_.set(key, propertyStub);

    this.addNamespaceRef_(propertyStub);
    this.addObjectRef_(object, propertyStub);
  }

  const original = this.properties_.get(key);

  // Default type to REPLACE
  if (typeof type === 'undefined'){
    type = ReplaceType.REPLACE;
  }

  original.replace(type, replacer);
};

/**
 * Restore the original value for a property in a object
 * @param {object} object
 * @param {string} property
 * @return {boolean}
 */
PropertyReplacer.prototype.restore = function(object, property){

  if (typeof property !== 'undefined'){
    const key = this.getKey_(object, property, false);
    if (this.hasKey_(key)){
      const propertyStub = this.properties_.get(key);
      return this.restore__(propertyStub);
    }
    return false;
  }

  return this.restoreObject_(object);
};

/**
 * Restore a model and Remove all the reference to it
 * @param {PropertyStub} propertyStub
 * @return {boolean}
 * @private
 */
PropertyReplacer.prototype.restore__ = function(propertyStub){

  const key = propertyStub.key_;
  const obj = propertyStub.object_;
  const namespace = propertyStub.namespace_;

  if (!this.hasKey_(key)){
    return false;
  }

  propertyStub.restore();

  this.removeObjectRef_(obj, propertyStub);
  this.removeNamespaceRef_(namespace, propertyStub);
  return this.properties_.delete(key);
};

/**
 * Restore all property stubs for a particular object
 * remove the hash proeprty on the original object
 * @param {object} object
 * @return {boolean}
 * @private
 */
PropertyReplacer.prototype.restoreObject_ = function(object){
  const objectHash = this.getHash_(object, false);

  if (!this.objects_.has(objectHash)){
    return false;
  }

  const stubs = this.objects_.get(objectHash);
  for (let i = stubs.length - 1; i > 0; i--){
    this.restore__(stubs[i]);
  }

  this.objects_.delete(objectHash);

  this.cleanObject_(object);
  return true;
};


/**
 * restore all property stub created in a particular namespace
 * if reset flag is supplied to true, will reset all the values with the one of the previous namespace
 * if no namespace supplied default to the current namespace in use
 * @param {string=} namespace=this.currentNamespace_ - namespace to restore
 * @param {boolean=} reset - flag to reset the restored namespace
 * @return {boolean} true if the namespace was restored
 */
PropertyReplacer.prototype.restoreNamespace = function(namespace, reset){

  if (namespace === undefined){
    namespace = this.currentNamespace_;
    reset = true;
  }
  else if (typeof namespace !== 'string'){
    //TODO-namespace namespace could be numbers maybe ??
    throw new Error('PropertyReplacer#restoreNamespace namespace param should be a string');
  }

  // Don't need to do anything if you don't want to reset current namespace ...
  if (!reset && namespace === this.currentNamespace_){
    return false;
  }

  const iOfNamespace = this.namespacesPath_.indexOf(namespace);
  if (iOfNamespace === -1){
    throw new Error('can\'t find namespace named: ' + namespace);
  }

  let iOfAfterNamespace = iOfNamespace;

  // If we want to restore the namespace after the one supplied
  if (!reset){
    // shift
    if (iOfAfterNamespace < this.namespacesPath_.length - 1){
      iOfAfterNamespace++;
      // Do no remove current namespace
      reset = true;
    }
  }

  for (let i = this.namespacesPath_.length - 1; i >= iOfAfterNamespace; i--){

    // Get the acual namespace to restore the origin values of the propertyStubs
    const namespaceToRestore = this.namespacesPath_[i];

    // Restore all the properties
    const refs = this.namespaces_.get(namespaceToRestore);
    for (let j = refs.length - 1; j >= 0; j--){
      this.restore__(refs[j]);
    }

    // Dont remove last item if we're resetting ?
    if (!(i === iOfAfterNamespace && reset)){
      if (this.namespacesPath_.length > 1){
        this.namespaces_.delete(namespaceToRestore);
        //FIXME-maybenot if remove namespace in between we break the chain of the original_ of the namespace+1 property subs
        //Should be actually popping out values from the end so...
        this.namespacesPath_.splice(i, 1);
      }
    }
  }

  //Update current namespace
  this.currentNamespace_ = namespace;
  return true;

};


/**
 * restore all property stub created in the current namespace
 */
PropertyReplacer.prototype.resetNamespace = function(){
  const namespaceToRestore = this.currentNamespace_;

  // Restore all the properties
  const refs = this.namespaces_.get(namespaceToRestore);
  for (let j = refs.length - 1; j >= 0; j--){
    this.restore__(refs[j]);
  }
};

/**
 * Restore ALL the original values for ALL field in ALL object_
 * //FIXME-tt this methods should remove references
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

  if (!create && !object.hasOwnProperty(property)){
    throw new Error('Object dont have property :' + property);
  }

  const hash = this.getHash_(object, create);

  if (!hash){
    throw new Error('can\'t find a hash for ' + object);
  }

  const key = this.currentNamespace_ + ':' + hash + ':' + property;

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
 * Adds a propertyStub reference to the internal namespaces_ map for the current namespace defined {@see #setup}
 * @param {PropertyStub} propertyStub
 * @return {boolean} true if namespace ref was added
 */
PropertyReplacer.prototype.addNamespaceRef_ = function(propertyStub){
  // If no namespace defined don't register it
  // if (!this.currentNamespace_){
  //   return false;
  // }
  // initialize default ref list if not exists
  if (!this.namespaces_.has(this.currentNamespace_)){
    this.namespaces_.set(this.currentNamespace_, []);
  }

  const list = this.namespaces_.get(this.currentNamespace_);

  // Add propertyStub ref to the list if not exists already
  if (list.indexOf(propertyStub) === -1){
    list.push(propertyStub);
    return true;
  }

  return false;
};

/**
 * Remove a propertyStub reference to the internal namespaces_ map for the current namespace defined {@see #setup}
 * @param {string} namespace
 * @param {PropertyStub} propertyStub
 * @return {boolean} true if namespace ref was removed
 */
PropertyReplacer.prototype.removeNamespaceRef_ = function(namespace, propertyStub){
  // If no namespace can't remove it
  if (!namespace){
    return false;
  }
  if (!this.namespaces_.has(namespace)){
    return false;
  }

  const list = this.namespaces_.get(namespace);
  // remove if exists
  const iOf = list.indexOf(propertyStub);
  if (iOf !== -1){
    list.splice(iOf, 1);
    return true;
  }

  return false;
};

/**
 * Adds a propertyStub reference to the internal objects_ map for the object
 * @param {object} object
 * @param {PropertyStub} propertyStub
 * @return {boolean} true if namespace ref was added
 */
PropertyReplacer.prototype.addObjectRef_ = function(object, propertyStub){
  //FIXME-NOTWORKING we can't save all the propertyStubs in a list like this, the list have to be sync with what we might want to restore for the current state

  const objectHash = this.getHash_(object, false);

  // initialize default ref list if not exists
  if (!this.objects_.has(objectHash)){
    this.objects_.set(objectHash, []);
  }

  const list = this.objects_.get(objectHash);

  // Add propertyStub ref to the list if not exists already
  if (list.indexOf(propertyStub) === -1){
    list.push(propertyStub);
    return true;
  }

  return false;
};

/**
 * Delete the property of the object that contain the hash
 * @param {object} object
 * @private
 */
PropertyReplacer.prototype.cleanObject_ = function(object){
  if (object.hasOwnProperty(this.hash_)){
    delete object[this.hash_];
  }
};

/**
 * Remove a propertyStub reference to the internal objects_ map
 * @param {object} object
 * @param {PropertyStub} propertyStub
 * @return {boolean} true if the reference was removed
 */
PropertyReplacer.prototype.removeObjectRef_ = function(object, propertyStub){

  const objectHash = this.getHash_(object, false);

  // can't remove something if there no not something
  if (!this.objects_.has(objectHash)){
    return false;
  }

  const list = this.objects_.get(objectHash);

  // remove if exists
  const iOf = list.indexOf(propertyStub);
  if (iOf !== -1){
    list.splice(iOf, 1);

    if (!list.length){
      this.cleanObject_(object);
    }

    return true;
  }

  return false;
};


/**
 * Class to handle the replacement/restore of the value
 *
 * @param {object} obj
 * @param {string} property
 * @param {string=} key
 * @param {string=} namespace
 *
 * @constructor
 * @class
 */
function PropertyStub(obj, property, key, namespace){

  /**
   * unique Key for the sub
   * @type {string}
   * @private
   */
  this.key_ = key;

  /**
   * namespace used for that property stub
   * @type {string}
   * @private
   */
  this.namespace_ = namespace;

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
    // Setter from the PropertyDescriptor should not return any value, but the SETTER could be
    // hooked to a custom callable that would return a new value
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
  let rValue = this.value_;
  // Should get_before have access to the value ? the real getter will not use any value
  if (typeof this.replacers_[ReplaceType.GETTER_BEFORE] === 'function'){
    rValue = this.replacers_[ReplaceType.GETTER_BEFORE].call(this.object_);
  }
  if (typeof this.replacers_[ReplaceType.GETTER] === 'function'){
    rValue = this.replacers_[ReplaceType.GETTER].call(this.object_);
  }
  if (typeof this.replacers_[ReplaceType.GETTER_AFTER] === 'function'){
    rValue = this.replacers_[ReplaceType.GETTER_AFTER].call(this.object_, rValue);
  }
  //TODO-tt should GETTER override this.value_ ?
  return rValue;
};

/**
 * Set the callack for hook or replace current value
 * @param {ReplaceType} type
 * @param {function()|*} value
 * @TODO-feature maybe type should be a flag combination, allowing to add the value for multiple replacement type ??
 */
PropertyStub.prototype.replace = function(type, value){

  if (!this.initialized_){
    this.setupProperty_();
  }

  const obj = this.object_;

  // REPLACE type should clear all replacer and update the current value ?
  if (type === ReplaceType.REPLACE){
    this.replacers_ = {};
    // Why was that code there ?
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
