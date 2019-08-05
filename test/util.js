const pHash = '_$_$_hash';

/**
 * Class used to handle property replacement in tests
 *
 * @usage:
 *
 *
 * @class
 * @constructor
 * @property {Object} properties_
 */
function PropertyReplacer(){

  this.properties_ = new Map();

  this.hash_ = pHash;

  this.nId = 0;
}

/**
 *
 * @param {object} object
 * @param {string} property
 * @param {*} value
 * @param {number=} type
 * @constructor
 *
 * @property {object} object
 * @property {string} property
 * @property {*} value
 * @property {?number} type
 *
 */
function PropertyModel(object, property, value, type){
  this.object = object;
  this.value = value;
  this.property = property;
  this.type = type;
}


/**
 * @enum {number}
 */
PropertyReplacer.TYPE = {
  BEFORE: -1,
  REPLACE: 0,
  AFTER: 1,
};

/**
 * Replace a property with a replacer, usefull for mitm functions
 * @param {object} object
 * @param {string} property
 * @param {*} replacer
 * @param {PropertyReplacer.TYPE} type=PropertyReplacer.TYPE.REPLACE
 */
PropertyReplacer.prototype.replace = function(object, property, replacer, type){

  const key = this.getKey_(object, property);

  if (!this.properties_.has(key)){
    const propertyModel = new PropertyModel(object, property, object[property]);
    this.properties_.set(key, propertyModel);
  }

  const original = this.properties_.get(key);

  if (typeof replacer === 'function'){

    // Default type to REPLACE
    if (typeof type === 'undefined'){
      type = PropertyReplacer.TYPE.REPLACE;
    }

    switch (type){
      case PropertyReplacer.TYPE.BEFORE:
        object[property] = function(){
          //replacer is called before Original, meaning that we can control all original arguments
          // Then replacer should return an Array of arguments
          let rValue = replacer.apply(original.object, arguments);

          // If we have a rValue but its not an array convert it to an array to be able to call it with the apply method
          // void 0 is the only rValue that is useless to forward...
          if (rValue !== void 0 && !Array.isArray(rValue)){
            rValue = [rValue];
          }
          return original.value.apply(original.object, rValue);
        };
        break;

      case PropertyReplacer.TYPE.REPLACE:
        object[property] = replacer;
        break;

      case PropertyReplacer.TYPE.AFTER:
        //replacer is called after Original, meaning that it can only have access to the return value of the original function
        object[property] = function(){
          const rValue = original.value.apply(original.object, arguments);
          return replacer.call(original.object, rValue);
        };
        break;

      default:
        throw new Error('Unkown type : ' + type + ' for callable');
    }
  }
  else {
    object[property] = replacer;
  }

};

/**
 * Restore the original value for a field in a object
 * @param {object} object
 * @param {string} property
 * @return {boolean}
 */
PropertyReplacer.prototype.restore = function(object, property){
  const key = this.getKey_(object, property, false);
  if (this.hasKey_(key)){
    object[property] = this.properties_.get(key).value;
    return this.properties_.delete(key);
  }
  return false;
};

/**
 * Restore ALL the original values for ALL field in ALL object
 */
PropertyReplacer.prototype.restoreAll = function(){
  this.properties_.forEach(propertyModel => {
    const key = this.getKey_(propertyModel.object, propertyModel.property, false);
    if (this.hasKey_(key)){
      propertyModel.object[propertyModel.property] = propertyModel.value;
    }
    else {
      console.error('Object [' + key + '] does not have property :' + propertyModel.property);
    }
  });
  this.properties_.clear();
};

/**
 * REturn a unique has for an object
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
      throw new Error('hash does not exists for object ' + object);
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
    throw new Error('property has to be a string');
  }

  if (!(property in object)){
    throw new Error('Object dont have property :' + property);
  }

  const hash = this.getHash_(object, create);

  if (!hash){
    throw new Error('canfind a hash for ' + object);
  }

  const key = hash + ':' + property;

  if (!create && !this.hasKey_(key)){
    throw new Error('key [' + key + ']does not exists for object ' + object);
  }

  return key;
};

PropertyReplacer.prototype.hasKey_ = function(key){
  return this.properties_.has(key);
};

module.exports = {
  PropertyReplacer: PropertyReplacer,
};
