
const pHash = '_$_$_hash';

/**
 *
 * @usage:
 *
 *
 * @class
 * @constructor
 * @property {Map<string, PropertyModel>} properties_
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
    let propertyModel = new PropertyModel(object, property, object[property]);
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
          return original.value.apply(original.object, replacer.apply(original.object, arguments));
        };
        break;
      case PropertyReplacer.TYPE.REPLACE:
        object[property] = replacer;
        break;
      case PropertyReplacer.TYPE.AFTER:
        object[property] = function(){
          return replacer.call(original.object, original.value.apply(original.object, arguments));
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
  if (this.properties_.has(key)) {
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
    if (this.properties_.has(key)) {
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
      throw new Error('hash does not exists for object '+object);
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

  if (typeof property !== "string"){
    throw new Error('property has to be a string');
  }

  if (!property in object){
    throw new Error('Object dont have property :'+property);
  }

  const hash = this.getHash_(object, create);

  if (!hash){
    throw new Error('canfind a hash for '+object);
  }

  const key = hash + ':'+property;

  if (!create && !this.properties_.has(key)){
    throw new Error('key ['+key+']does not exists for object '+object);
  }

  return key;
};

module.exports = {
  PropertyReplacer : PropertyReplacer
};
