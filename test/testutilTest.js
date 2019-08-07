/**
 * Created by hacketo on 04/08/19.
 */

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

chai.use(sinonChai);

const should = chai.should();
const expect = chai.expect;

sinon.assert.expose(chai.assert, { prefix: "" });

const assert = chai.assert;

const nutil = require('util');
const util = require('./util');
const PropertyReplacer = util.PropertyReplacer;
const PropertyModel = util.PropertyModel;

/**
 * Return a new spy that return arguments values
 * Used to mock the Before/After behavior so
 * if 1 argument supplied : return argument[0]
 * if x arguments supplied : return [...arguments]
 *
 * @return {Array|*}
 */
const getSpyArgs = function(){
  return sinon.spy(function(){
    if (arguments.length === 1){
      return arguments[0];
    }
    return Array.prototype.slice.call(arguments);
  });
};

/**
 * Return a new spy that return 1
 * @param {*=} a
 * @return {spy}
 */
const getSpy1 = function(a){
  return sinon.spy(function(){
    return a || 1;
  });
};

/**
 * Helper to expect a call on a spy
 *
 * @param {spy} spy - the spy to check
 * @param {object} on - value to expect to be the *this* context when executing the spy
 * @param {Array|*} args - list of arguments used to call the spy
 * @param {string=} msg - msg to display in case of any error
 */
const calledOnWith = function(spy, on, args, msg){
  expect(spy, msg).to.have.been.calledOn(on);
  expect(spy.lastCall.args, msg).to.deep.equal(!Array.isArray(args) ? [args] : args);
};

/**
 * Helper.. to expect a spy to not have been called
 * @param {spy} spy
 * @param {string=} msg
 */
const notCalled = function(spy, msg){
  expect(spy, msg).to.have.not.been.called;
};

/**
 * name of the property used for the tests
 * @type {string}
 */
const PNAME = 'myFunction';

describe('PropertyModel', function(){

  /**
   * Model used in tests
   * @type {PropertyModel}
   */
  let model;

  /**
   * object to test the PropertyModel on
   * @type {object}
   */
  let myObject;

  /**
   * Original function of the myObject myFunction property
   * @type {spy}
   */
  let originalFn;

  /**
   *
   * @type {PropertyDescriptor}
   */
  let originalPropertyDescriptior;

  describe('construct', function(){

    beforeEach(function(){
      //initialize default original spy for object_ myFunction that return 1
      originalFn = getSpy1();
      // Create new Object
      myObject = {
        [PNAME]: originalFn,
      };
      originalPropertyDescriptior = Object.getOwnPropertyDescriptor(myObject, PNAME);
      model = new PropertyModel(myObject, PNAME);
    });

    afterEach(function(){

    });

    it('should initialize the object_ property', function(){
      expect(model.object_, 'the internal object_ reference should be equal to the same given in the constructor').to.equal(myObject);
    });
    it('should initialize the property_ property', function(){
      expect(model.property_, 'the internal object_ reference should be equal to the same given in the constructor').to.equal(PNAME);
    });
    it('should initialize the origin_ property', function(){
      expect(model.origin_, 'the origin_ value should be the original PropertyDescriptor of the object').to.deep.equal(originalPropertyDescriptior);
    });
    it('should initialize the initial value_ property', function(){
      expect(model.value_, 'the value_ should be the one retrieved on the object').to.equal(myObject[PNAME]);
    });
    it('should not initialize the function proxy', function(){
      expect(model.fnProxy_, 'the fnProxy_ value should not be initialized').to.equal(undefined);
    });
  });

  describe('setupProperty_', function(){
    beforeEach(function(){
      //initialize default original spy for object_ myFunction that return 1
      originalFn = getSpy1();
      // Create new Object
      myObject = {
        myFunction: originalFn,
      };
      model = new PropertyModel(myObject, PNAME);
    });

    describe('setter_', function(){
      it('should bind the setter on this.setter_', function(){

        const value = 1;

        const setterSpy = sinon.spy(function(val){
          this.value_ = val;
          return val;
        });
        model.setter_ = setterSpy;

        expect(myObject.myFunction).to.equal(originalFn);

        myObject.myFunction = value;

        calledOnWith(setterSpy, model, [value]);
        expect(model.value_).to.equal(value);
      });

      it('should add a SETTER replacer', function(){

        const value = 1;

        const setterSpy = sinon.spy(function(val){
          return val;
        });

        const myObject2 = {};
        Object.defineProperty(myObject2, PNAME, {
          set: setterSpy,
          configurable: true,
        });

        const model2 = new PropertyModel(myObject2, PNAME);

        myObject2[PNAME] = value;

        calledOnWith(setterSpy, myObject2, [value]);
        expect(model2.value_).to.equal(value);
      });
    });

    describe('getter_', function(){
      const getterSpy = sinon.spy(function(){
        return 1;
      });

      beforeEach(function(){
        getterSpy.resetHistory();
      });


      it('should bind the getter on this.getter_', function(){

        model.getter_ = getterSpy;

        // resolve a value;
        expect(myObject[PNAME]).to.equal(1);

        calledOnWith(getterSpy, model, []);

        expect(model.value_).to.equal(originalFn);
      });

      it('should add a GETTER replacer', function(){

        const myObject2 = {};
        Object.defineProperty(myObject2, PNAME, {
          get: getterSpy,
          configurable: true,
        });

        const model2 = new PropertyModel(myObject2, PNAME);

        // resolve a value;
        expect(myObject2[PNAME]).to.equal(1);

        calledOnWith(getterSpy, myObject2, []);

        expect(model2.value_).to.equal(1);
      });
    });
  });

  describe('observe', function(){

    /**
     * Initialize a new object myObject before each test bellow
     */
    beforeEach(function(){
      // Create new Object
      myObject = {};
    });

    /**
     * All the tests about the SETTER replacement
     */
    describe('SETTER', function(){

      /**
       * Spy used on the setter of the property
       * Return 1
       * @type {spy}
       */
      const defaultSetter = getSpy1();

      /**
       * Spy used in tests
       * Return 2
       * @type {spy}
       */
      const spySetter = getSpy1(2);

      // Beafore each test reset spies and create property on myObject reseted in {@see #beforeEach}
      beforeEach(function(){
        // Create new Object
        spySetter.resetHistory();
        defaultSetter.resetHistory();
        Object.defineProperty(myObject, PNAME, {
          set: defaultSetter,
          configurable: true,
        });
      });

      it('should hook the original setter to a SETTER replacer', function(){

        const model2 = new PropertyModel(myObject, PNAME);

        expect(model2.replacers_[PropertyReplacer.TYPE.SETTER], 'should have a default GETTER replacer').to.equal(defaultSetter);

        // We have no default value and no setter so ...
        expect(myObject[PNAME]).to.equal(undefined);

        myObject[PNAME] = 2;
        calledOnWith(defaultSetter, myObject, [2]);

        expect(model2.value_, 'setter should have updated value').to.equal(1);
      });

      it('should REPLACE the real setter with the spy', function(){

        const model2 = new PropertyModel(myObject, PNAME);

        model2.observe(PropertyReplacer.TYPE.SETTER, spySetter);

        myObject[PNAME] = 3;
        calledOnWith(spySetter, myObject, [3]);
        notCalled(defaultSetter);
      });

      it('should hook the spy BEFORE the real setter', function(){

        const model2 = new PropertyModel(myObject, PNAME);

        model2.observe(PropertyReplacer.TYPE.SETTER_BEFORE, spySetter);

        myObject[PNAME] = 3;
        calledOnWith(spySetter, myObject, [3]);
        calledOnWith(defaultSetter, myObject, [2]);

        expect(spySetter).calledBefore(defaultSetter);

        // Value returned by default setter is 1
        expect(model2.value_, 'setter should have updated value').to.equal(1);
      });

      it('should hook the spy AFTER the real setter', function(){

        const model2 = new PropertyModel(myObject, PNAME);

        model2.observe(PropertyReplacer.TYPE.SETTER_AFTER, spySetter);

        myObject[PNAME] = 3;
        calledOnWith(defaultSetter, myObject, [3]);
        calledOnWith(spySetter, myObject, [1]);

        expect(defaultSetter).calledBefore(spySetter);

        // Value returned by spy setter is 2
        expect(model2.value_, 'setter should have updated value').to.be.equal(2);
      });

      it('should hook the spy AFTER the real setter inherited', function(){

        const Parent = function(){
          this.name = 'n';

          Object.defineProperty(this, PNAME, {
            set: defaultSetter,
            configurable: true,
          });
        };

        const MyObject = function(){
          Parent.call(this);
        };
        nutil.inherits(MyObject, Parent);

        myObject = new MyObject();

        const model2 = new PropertyModel(myObject, PNAME);

        model2.observe(PropertyReplacer.TYPE.SETTER_AFTER, spySetter);

        myObject[PNAME] = 3;
        calledOnWith(defaultSetter, myObject, [3]);
        calledOnWith(spySetter, myObject, [1]);

        expect(defaultSetter).to.have.been.calledBefore(spySetter);

        // Value returned by spy setter is 2
        expect(model2.value_, 'setter should have updated value').to.be.equal(2);
      });
    });


    /**
     * All the tests about the GETTER replacement
     */
    describe('GETTER', function(){

      /**
       * Spy used on the getter of the property
       * Return 1
       * @type {spy}
       */
      const defaultGetter = getSpy1();

      /**
       * Spy used in tests
       * Return 1
       * @type {spy}
       */
      const spyGetter = getSpy1(2);

      beforeEach(function(){
        defaultGetter.resetHistory();
        spyGetter.resetHistory();

        Object.defineProperty(myObject, PNAME, {
          get: defaultGetter,
          configurable: true,
        });
      });

      it('should hook the original getter to a GETTER replacer', function(){

        const model2 = new PropertyModel(myObject, PNAME);

        expect(model2.replacers_[PropertyReplacer.TYPE.GETTER], 'should have a default GETTER replacer').to.equal(defaultGetter);

        expect(myObject[PNAME]).to.equal(1);
        calledOnWith(defaultGetter, myObject, []);

        expect(model2.value_).to.be.equal(1);
      });

      it('should REPLACE the real getter with the spy', function(){

        notCalled(defaultGetter, 'the spy should replace the original getter');

        const model2 = new PropertyModel(myObject, PNAME);


        calledOnWith(defaultGetter, myObject, [], 'the default should\' ve been called once to retrieve the value');

        model2.observe(PropertyReplacer.TYPE.GETTER, spyGetter);

        expect(myObject[PNAME]).equal(2);

        calledOnWith(spyGetter, myObject, [], 'the spy should replace the original getter');

        expect(defaultGetter, 'The default getter should\'ve not been called anymore').to.have.been.calledOnce;

      });

      it('should hook the spy BEFORE the real getter', function(){

        const spyGetter = getSpy1(2);

        const model2 = new PropertyModel(myObject, PNAME);

        model2.observe(PropertyReplacer.TYPE.GETTER_BEFORE, spyGetter);

        expect(myObject[PNAME]).to.equal(1);

        calledOnWith(spyGetter, myObject, []);
        calledOnWith(defaultGetter, myObject, []);

        expect(spyGetter).to.have.been.calledBefore(defaultGetter);

        // Value returned by default setter is 1
        expect(model2.value_, 'setter should have updated value').to.be.equal(1);
      });

      it('should hook the spy AFTER the real getter', function(){

        const spyGetter = getSpy1(2);

        const model2 = new PropertyModel(myObject, PNAME);

        model2.observe(PropertyReplacer.TYPE.GETTER_AFTER, spyGetter);

        expect(myObject[PNAME]).to.equal(2);

        calledOnWith(defaultGetter, myObject, []);
        calledOnWith(spyGetter, myObject, [1]);

        expect(defaultGetter).to.have.been.calledBefore(spyGetter);

        // Value returned by default setter is 1
        expect(model2.value_, 'setter should have updated value').to.be.equal(1);
      });
    });


    /**
     * All the tests about the REPLACE replacement
     */
    describe('REPLACE', function(){
      it('should replace the value of the property', function(){
        //TODO write test
      });

      it('should not call setter when setting the new value of the property', function(){
        //TODO write test
      });

      it('should not call getter when getting the new value of the property', function(){
        //TODO write test
      });

      it('should clear all replacers already defined', function(){
        //TODO write test
      });
    });
  });
});

describe('PropertyReplacer', function(){

  let propertyReplacer;
  let myObject;
  let spy;
  let originalFn;
  let originalCopy_;

  before(function(){
    propertyReplacer = new PropertyReplacer();
  });

  beforeEach(function(){

    // Check empty properties
    expect(propertyReplacer.properties_.size).to.equal(0);

    //initialize default original spy for object_ myFunction that return 1
    originalFn = getSpy1();

    // Create new Object
    myObject = {
      myFunction: originalFn,
    };

    originalCopy_ = originalFn;

    // Init default spy on arguments
    spy = getSpyArgs();
  });

  // After each test we want to restore all properties and check that they are actually restored
  afterEach(function(){

    const props = propertyReplacer.properties_.keys();

    //Retrieve a map of originals
    const originals = {};
    for (let i = 0, len = props.length; i < len; i++) {
      const property = propertyReplacer.properties_.get(props[i]);
      originals[props[i]] = property;
    }

    // restore all properties to their original state
    propertyReplacer.restoreAll();

    //Check that every objects should have their default properties value restored
    for (const key in originals){
      if (!originals.hasOwnProperty(key)){
        continue;
      }

      const prop = originals[key];
      expect(prop.object_[prop.property_]).to.deep.equal(prop.value);
    }

    expect(propertyReplacer.properties_.size).to.equal(0);

    //last Check original copy of the myObject[PNAME]
    expect(myObject[PNAME]).to.equal(originalCopy_);

  });

  describe('construct', function(){
    it('should have a list of replaced properties', function(){
      expect(propertyReplacer.properties_).to.be.instanceOf(Map);
    });

  });

  describe('#replace add replacer', function(){

    it('should add a replacer for a function : REPLACE', function(){

      propertyReplacer.replace(myObject, PNAME, spy, PropertyReplacer.TYPE.REPLACE);

      const rValue = myObject[PNAME]('a', 'b', 'c');

      expect(rValue).to.deep.equal(['a', 'b', 'c']);

      calledOnWith(spy, myObject, ['a', 'b', 'c'], 'Spy should have been called');
      notCalled(originalFn, 'Original function should be replaced with the Spy, therefore not been called');

    });

    it('should add a replacer for a function : AFTER', function(){

      propertyReplacer.replace(myObject, PNAME, spy, PropertyReplacer.TYPE.AFTER);

      return Promise.resolve(myObject[PNAME]('a', 'b', 'c')).then((rValue) => {
        expect(rValue).to.equal(1);

        calledOnWith(originalFn, myObject, ['a', 'b', 'c'], 'Original called first');
        calledOnWith(spy, myObject, 1, 'spy called after, rValue of original is 1');

        expect(originalFn, 'Original function should have been called before the spy').to.have.been.calledBefore(spy);
      });
    });

    it('should add a replacer for a function : BEFORE', function(){

      propertyReplacer.replace(myObject, PNAME, spy, PropertyReplacer.TYPE.BEFORE);

      return Promise.resolve(myObject[PNAME]('a', 'b')).then((rValue) => {
        expect(rValue).to.equal(1);

        calledOnWith(originalFn, myObject, ['a', 'b'], 'Original called after, spy returned same argument list');
        calledOnWith(spy, myObject, ['a', 'b'], 'spy called before');

        expect(spy, 'Spy should have been called before the original function').to.have.been.calledBefore(originalFn);
      });
    });

    it('should add a replacer for a function setter/getter : REPLACE', function(){

      const myObject2 = {};
      let objVar;
      Object.defineProperty(myObject2, PNAME, {
        configurable: true,
        set(val){
          objVar = val;
        },
        get(){
          return objVar;
        },
      });

      propertyReplacer.replace(myObject2, PNAME, spy);
      expect(myObject2[PNAME]).to.equal(spy);
      expect(objVar, 'should not have changed, original setter not called').to.equal(undefined);

      const spy2 = getSpy1();
      myObject2[PNAME] = spy2;
      expect(myObject2[PNAME]).to.equal(spy2);
      expect(objVar, 'should not have changed, original setter not called').to.equal(undefined);

      myObject2[PNAME]();
      calledOnWith(spy2, myObject2, [], 'Spy2 should have been called');
    });
  });

  describe('#replace replace replacer', function(){

    it('should be able to replace a replacer when a new one is added on the same property_', function(){

      const spy2 = getSpyArgs();

      propertyReplacer.replace(myObject, PNAME, spy);
      propertyReplacer.replace(myObject, PNAME, spy2);

      return Promise.resolve(myObject[PNAME]('a', 'b')).then((rValue) => {
        expect(rValue).to.deep.equal(['a', 'b']);

        calledOnWith(spy2, myObject, ['a', 'b']);
        notCalled(originalFn);
        notCalled(spy);
      });

    });

    it('should be able to remove a replacer and restore to its original state', function(){

      // Store original value
      const objectFn1 = myObject[PNAME];

      propertyReplacer.replace(myObject, PNAME, spy, PropertyReplacer.TYPE.AFTER);

      expect(propertyReplacer.properties_.get(myObject[propertyReplacer.hash_]));

      propertyReplacer.restore(myObject, PNAME);

      // Default value
      expect(myObject[PNAME]).to.equal(objectFn1);

      return Promise.resolve(myObject[PNAME]('a', 'b')).then((rValue) => {
        expect(rValue).to.equal(1);
        notCalled(spy);
        calledOnWith(myObject[PNAME], myObject, ['a', 'b']);
      });

    });

    it('should be able to restore a replacer on a setter/getter', function(){

      const myObject2 = {};
      let objVar;
      Object.defineProperty(myObject2, PNAME, {
        configurable: true,
        set(val){
          objVar = val;
        },
        get(){
          return objVar;
        },
      });

      myObject2[PNAME] = originalCopy_;
      expect(objVar).to.equal(originalCopy_);

      propertyReplacer.replace(myObject2, PNAME, spy);

      // Here we expect that it did not fire the default setter/getter
      expect(objVar).to.equal(originalCopy_);

      return Promise.resolve(myObject2[PNAME]('a', 'b', 'c')).then((rValue) => {
        expect(rValue).to.deep.equal(['a', 'b', 'c']);

        calledOnWith(spy, myObject2, ['a', 'b', 'c'], 'Spy should have been called');
        notCalled(originalFn, 'Original function should be replaced with the Spy, therefore not been called');

        propertyReplacer.restore(myObject2, PNAME);

        myObject2[PNAME] = 5;

        expect(objVar).to.equal(5);
      });
    });

    it('should be able to restore all replacers', function(){

      myObject.myFunction2 = getSpy1();

      const myObject2 = {
        myFunction: getSpy1(),
        myFunction2: getSpy1(),
      };

      const spy2 = getSpyArgs();
      const spy3 = getSpyArgs();
      const spy4 = getSpyArgs();

      const objectFn1 = myObject[PNAME];
      const objectFn2 = myObject.myFunction2;
      const object2Fn1 = myObject2.myFunction;
      const object2Fn2 = myObject2.myFunction2;

      propertyReplacer.replace(myObject, PNAME, spy, 1);
      propertyReplacer.replace(myObject, 'myFunction2', spy2, 1);
      propertyReplacer.replace(myObject2, PNAME, spy3, 1);
      propertyReplacer.replace(myObject2, 'myFunction2', spy4, 1);

      propertyReplacer.restoreAll();

      return Promise.all([
        myObject[PNAME]('a', 'b'),
        myObject.myFunction2('a', 'b', 'c'),
        myObject2.myFunction('a', 'b', 'c', 'd'),
        myObject2.myFunction2('a', 'b', 'c', 'd', 'e'),
      ]).then((rValue) => {
        expect(rValue).to.deep.equal([1, 1, 1, 1]);

        notCalled(spy);
        notCalled(spy2);
        notCalled(spy3);
        notCalled(spy4);

        expect(myObject[PNAME]).to.equal(objectFn1);
        expect(myObject.myFunction2).to.equal(objectFn2);
        expect(myObject2.myFunction).to.equal(object2Fn1);
        expect(myObject2.myFunction2).to.equal(object2Fn2);

        calledOnWith(myObject[PNAME], myObject, ['a', 'b']);
        calledOnWith(objectFn1, myObject, ['a', 'b']);
        calledOnWith(objectFn2, myObject, ['a', 'b', 'c']);
        calledOnWith(object2Fn1, myObject2, ['a', 'b', 'c', 'd']);
        calledOnWith(object2Fn2, myObject2, ['a', 'b', 'c', 'd', 'e']);
      });
    });
  });
});
