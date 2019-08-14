/**
 * Created by hacketo on 04/08/19.
 */

const chai = require('chai');
const sinon = require('sinon');
const expect = chai.expect;

// if (!global.SINON_CHAI){
//   const sinonChai = require('sinon-chai');
//   chai.use(sinonChai);
//   global.SINON_CHAI = true;
// }

const util = require('util');

const replacer = require('./property_replacer');
const ReplaceType = replacer.ReplaceType;
const PropertyReplacer = replacer.PropertyReplacer;
const PropertyStub = replacer.PropertyStub;

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
 * Return a new spy used to mock the setter
 * @param {*=} a
 * @return {spy}
 */
const getSetterSpy = function(a){
  return sinon.spy(function(val){
    this.value = a !== undefined ? a : val;
    return this.value;
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
  expect(spy, msg).to.have.been.called;
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
 * @const
 * @type {string}
 */
const PNAME = 'myFunction';

describe('PropertyStub', function(){

  /**
   * Model used in tests
   * @type {PropertyStub}
   */
  let model;

  /**
   * object to test the PropertyStub on
   * @type {object}
   */
  let myObject;

  // ensure that a new model is recreated in every tests
  afterEach(function(){
    model = null;
  });

  describe('construct', function(){

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

    beforeEach(function(){
      //initialize default original spy for object_ myFunction that return 1
      originalFn = getSpy1();

      // Create new Object
      myObject = {
        [PNAME]: originalFn,
      };

      originalPropertyDescriptior = Object.getOwnPropertyDescriptor(myObject, PNAME);
    });

    context('with an existing property', function(){
      beforeEach(function(){
        model = new PropertyStub(myObject, PNAME);
      });

      it('should initialize the object_ property', function(){
        expect(model.object_, 'the internal object_ reference should be equal to the same given in the constructor')
            .to.equal(myObject);

        expect(model.property_, 'the internal property should be equal to the same given in the constructor')
            .to.equal(PNAME);

        expect(model.origin_, 'the origin_ value should be the original PropertyDescriptor of the object')
            .to.deep.equal(originalPropertyDescriptior);

        expect(model.value_, 'the value_ should be the one retrieved on the object')
            .to.equal(myObject[PNAME]);

        expect(model.fnProxy_, 'the fnProxy_ value should not be initialized')
            .to.equal(undefined);
      });
    });

    context('without an existing property', function(){

      const propName = '\x00';

      beforeEach(function(){
        model = new PropertyStub(myObject, propName);
      });

      it('should not initialize the value until setupProperty_ is called', function(){

        expect(myObject).to.not.haveOwnProperty(propName);

        model = new PropertyStub(myObject, propName);

        expect(myObject).to.not.haveOwnProperty(propName);
        expect(myObject[propName]).to.equal(undefined);

        expect(model.initialized_).to.be.false;

        model.setupProperty_();

        expect(myObject).to.haveOwnProperty(propName);

        model.restore();

        expect(myObject).to.not.haveOwnProperty(propName);
      });

    });

  });

  describe('setupProperty_', function(){

    describe('setter_', function(){

      /**
       * Spy used on the setter of the property
       * @type {spy}
       */
      const setterSpy = getSetterSpy();

      beforeEach(function(){
        setterSpy.resetHistory();
      });

      it('internal setter_ is called if the property is initialized', function(){

        //initialize default original spy for object_ myFunction that return 1
        const originalFn = getSpy1(1);

        // Create new Object
        const myObject = {
          [PNAME]: originalFn,
        };

        const model = new PropertyStub(myObject, PNAME);

        const value = 1;

        model.setter_ = setterSpy;

        expect(myObject[PNAME]).to.equal(originalFn);

        myObject[PNAME] = value;

        calledOnWith(setterSpy, model, [value]);
        notCalled(originalFn);
      });

      it('should add a SETTER replacer', function(){

        const value = 1;

        const myObject2 = {};
        Object.defineProperty(myObject2, PNAME, {
          set: setterSpy,
          configurable: true,
        });

        const model2 = new PropertyStub(myObject2, PNAME);

        myObject2[PNAME] = value;

        calledOnWith(setterSpy, myObject2, [value]);

        expect(model2.value_, 'custom setterSpy returns an overrided value that is interpreted to be the new value of the property')
          .to.equal(value);
      });
    });


    describe('getter_', function(){

      /**
       * Return value for the default getter function
       * @const
       * @type {number}
       */
      const defaultGetterValue = 1;

      /**
       * Spy used on the getter of the property
       * Return 1
       * @type {spy}
       */
      const getterSpy = sinon.spy(function(){
        return defaultGetterValue;
      });


      beforeEach(function(){
        getterSpy.resetHistory();
      });

      it('should bind the getter on this.getter_', function(){

        //initialize default original spy for object_ myFunction that return 1
        const originalFn = getSpy1();
        // Create new Object
        const myObject = {
          [PNAME]: originalFn,
        };
        const model = new PropertyStub(myObject, PNAME);

        model.getter_ = getterSpy;

        // resolve a value;
        expect(myObject[PNAME]).to.equal(defaultGetterValue);

        calledOnWith(getterSpy, model, []);

        expect(model.value_).to.equal(originalFn);
      });

      it('should add a GETTER replacer', function(){

        const myObject = {};
        Object.defineProperty(myObject, PNAME, {
          get: getterSpy,
          configurable: true,
        });

        const model = new PropertyStub(myObject, PNAME);

        // resolve a value;
        expect(myObject[PNAME]).to.equal(defaultGetterValue);

        calledOnWith(getterSpy, myObject, []);

        expect(model.value_).to.equal(defaultGetterValue);
      });
    });
  });

  describe('replace', function(){

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
       * Return value for the default setter function
       * @const
       * @type {number}
       */
      const defaultSetterValue = 1;

      /**
       * Spy used on the setter of the property
       * Return 1
       * @type {spy}
       */
      const defaultSetter = getSpy1(defaultSetterValue);

      /**
       * Return value for the spy setter function
       * @const
       * @type {number}
       */
      const spySetterValue = 2;

      /**
       * Spy used in tests
       * Return 2, update this.value
       * @type {spy}
       */
      const spySetter = getSetterSpy(2);

      // Beafore each test reset spies and create property on myObject reseted in {@see #beforeEach}
      beforeEach(function(){
        // Create new Object
        spySetter.resetHistory();
        defaultSetter.resetHistory();
        Object.defineProperty(myObject, PNAME, {
          set: defaultSetter,
          configurable: true,
        });

        model = new PropertyStub(myObject, PNAME);
      });

      it('should hook the original setter to a SETTER replacer', function(){

        expect(model.replacers_[ReplaceType.SETTER], 'should have a default GETTER replacer')
            .to.equal(defaultSetter);

        // We have no default value and no setter so ...
        expect(myObject[PNAME]).to.equal(undefined);

        myObject[PNAME] = 2;
        calledOnWith(defaultSetter, myObject, [spySetterValue]);

        // defaultSetter returns 1
        expect(model.value_, 'setter should have updated value')
            .to.equal(defaultSetterValue);
      });

      it('should REPLACE the real setter with the spy', function(){

        model.replace(ReplaceType.SETTER, spySetter);

        myObject[PNAME] = 3;
        calledOnWith(spySetter, myObject, [3]);

        notCalled(defaultSetter);
      });

      it('should hook the spy BEFORE the real setter', function(){

        model.replace(ReplaceType.SETTER_BEFORE, spySetter);

        myObject[PNAME] = 3;
        calledOnWith(spySetter, myObject, [3]);

        // Spy returns 2
        calledOnWith(defaultSetter, myObject, [spySetterValue]);

        expect(spySetter).to.have.been.calledBefore(defaultSetter);

        // Value returned by default setter is 1
        expect(model.value_, 'setter should have updated value')
            .to.equal(defaultSetterValue);
      });

      it('should hook the spy AFTER the real setter', function(){

        model.replace(ReplaceType.SETTER_AFTER, spySetter);

        myObject[PNAME] = 3;

        calledOnWith(defaultSetter, myObject, [3]);
        calledOnWith(spySetter, myObject, [defaultSetterValue]);

        expect(defaultSetter).to.have.been.calledBefore(spySetter);

        // Value returned by spy setter is 2
        expect(model.value_, 'setter should have updated value')
            .to.equal(spySetterValue);
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
        util.inherits(MyObject, Parent);

        myObject = new MyObject();

        const model = new PropertyStub(myObject, PNAME);

        model.replace(ReplaceType.SETTER_AFTER, spySetter);

        myObject[PNAME] = 3;
        calledOnWith(defaultSetter, myObject, [3]);
        calledOnWith(spySetter, myObject, [defaultSetterValue]);

        expect(defaultSetter).to.have.been.calledBefore(spySetter);

        // Value returned by spy setter is 2
        expect(model.value_, 'setter should have updated value')
            .to.equal(spySetterValue);
      });
    });


    /**
     * All the tests about the GETTER replacement
     */
    describe('GETTER', function(){


      /**
       * Return value for the default getter function
       * @const
       * @type {number}
       */
      const defaultGetterValue = 1;

      /**
       * Spy used on the getter of the property
       * Return 1
       * @type {spy}
       */
      const defaultGetter = getSpy1(defaultGetterValue);


      /**
       * Return value for the spy getter function
       * @const
       * @type {number}
       */
      const spyGetterValue = 2;

      /**
       * Spy used in tests
       * Return 1
       * @type {spy}
       */
      const spyGetter = getSpy1(spyGetterValue);

      beforeEach(function(){
        defaultGetter.resetHistory();
        spyGetter.resetHistory();

        Object.defineProperty(myObject, PNAME, {
          get: defaultGetter,
          configurable: true,
        });

        model = new PropertyStub(myObject, PNAME);
      });

      it('should hook the original getter to a GETTER replacer', function(){

        expect(model.replacers_[ReplaceType.GETTER], 'should have a default GETTER replacer')
            .to.equal(defaultGetter);

        expect(myObject[PNAME]).to.equal(defaultGetterValue);

        calledOnWith(defaultGetter, myObject, []);

        expect(model.value_).to.equal(defaultGetterValue);
      });

      it('should REPLACE the real getter with the spy', function(){

        calledOnWith(defaultGetter, myObject, [],
          'the default should\' ve been called once to retrieve the value');

        model.replace(ReplaceType.GETTER, spyGetter);

        expect(myObject[PNAME]).equal(spyGetterValue);

        calledOnWith(spyGetter, myObject, [],
          'the spy should replace the original getter');

        expect(defaultGetter, 'The default getter should\'ve not been called anymore')
            .to.have.been.calledOnce;

      });

      it('should hook the spy BEFORE the real getter', function(){

        model.replace(ReplaceType.GETTER_BEFORE, spyGetter);

        expect(myObject[PNAME]).to.equal(defaultGetterValue);

        calledOnWith(spyGetter, myObject, []);

        // Default getter will not handle any args so none is passed
        calledOnWith(defaultGetter, myObject, []);

        expect(spyGetter).to.have.been.calledBefore(defaultGetter);

        // Value returned by default setter is 1
        expect(model.value_, 'setter should have updated value')
            .to.equal(defaultGetterValue);
      });

      it('should hook the spy AFTER the real getter', function(){

        model.replace(ReplaceType.GETTER_AFTER, spyGetter);

        expect(myObject[PNAME]).to.equal(spyGetterValue);

        calledOnWith(defaultGetter, myObject, []);

        // Default getter returns 1
        calledOnWith(spyGetter, myObject, [defaultGetterValue]);

        expect(defaultGetter).to.have.been.calledBefore(spyGetter);

        expect(model.value_, 'setter should have updated value')
            .to.equal(defaultGetterValue);
      });
    });


    /**
     * All the tests about the REPLACE replacement
     */
    describe('REPLACE', function(){

      /**
       * spy used for the replace
       * return 1
       * @type {spy}
       */
      const spyReplace = getSpy1();

      it('should replace the value of the property', function(){

        const Parent = function(){
          this.name = 'n';
        };

        Parent.prototype.myFunction = getSpy1(2);

        const MyObject = function(){
          Parent.call(this);
        };
        util.inherits(MyObject, Parent);

        myObject = new MyObject();

        const model2 = new PropertyStub(myObject, PNAME);

        model2.replace(ReplaceType.REPLACE, spyReplace);

        expect(myObject[PNAME]()).to.equal(1);

        calledOnWith(spyReplace, myObject, []);
        notCalled(Parent.prototype.myFunction);

        model2.restore();

        expect(myObject[PNAME]()).to.equal(2);
        calledOnWith(Parent.prototype.myFunction, myObject, []);
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

  describe('#replace adds a replacer', function(){

    it('should add a replacer for a function : REPLACE', function(){

      propertyReplacer.replace(myObject, PNAME, spy, ReplaceType.REPLACE);

      const rValue = myObject[PNAME]('a', 'b', 'c');

      expect(rValue).to.deep.equal(['a', 'b', 'c']);

      calledOnWith(spy, myObject, ['a', 'b', 'c'], 'Spy should have been called');
      notCalled(originalFn, 'Original function should be replaced with the Spy, therefore not been called');

    });

    it('should add a replacer for a function : AFTER', function(){

      propertyReplacer.replace(myObject, PNAME, spy, ReplaceType.AFTER);

      const rValue = myObject[PNAME]('a', 'b', 'c');

      expect(rValue).to.deep.equal(1);

      calledOnWith(originalFn, myObject, ['a', 'b', 'c'], 'Original called first');
      calledOnWith(spy, myObject, 1, 'spy called after, rValue of original is 1');

      expect(originalFn, 'Original function should have been called before the spy')
          .to.have.been.calledBefore(spy);
    });

    it('should add a replacer for a function : BEFORE', function(){

      propertyReplacer.replace(myObject, PNAME, spy, ReplaceType.BEFORE);

      const rValue = myObject[PNAME]('a', 'b');

      expect(rValue).to.equal(1);

      calledOnWith(originalFn, myObject, ['a', 'b'], 'Original called after, spy returned same argument list');
      calledOnWith(spy, myObject, ['a', 'b'], 'spy called before');

      expect(spy, 'Spy should have been called before the original function')
          .to.have.been.calledBefore(originalFn);
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
      expect(objVar, 'should not have changed, original setter not called')
          .to.equal(undefined);

      const spy2 = getSpy1();
      myObject2[PNAME] = spy2;
      expect(myObject2[PNAME]).to.equal(spy2);
      expect(objVar, 'should not have changed, original setter not called')
          .to.equal(undefined);

      myObject2[PNAME]();
      calledOnWith(spy2, myObject2, [], 'Spy2 should have been called');
    });
  });

  describe('#replace replace a replacer', function(){

    it('should be able to replace a replacer when a new one is added on the same property_', function(){

      const spy2 = getSpyArgs();

      propertyReplacer.replace(myObject, PNAME, spy);
      propertyReplacer.replace(myObject, PNAME, spy2);

      const rValue = myObject[PNAME]('a', 'b');

      expect(rValue).to.deep.equal(['a', 'b']);

      calledOnWith(spy2, myObject, ['a', 'b']);
      notCalled(originalFn);
      notCalled(spy);
    });

    it('should be able to remove a replacer and restore to its original state', function(){

      // Store original value
      const objectFn1 = myObject[PNAME];

      propertyReplacer.replace(myObject, PNAME, spy, ReplaceType.AFTER);

      expect(propertyReplacer.properties_.get(myObject[propertyReplacer.hash_]));

      expect(propertyReplacer.restore(myObject, PNAME)).to.be.true;

      // Default value
      expect(myObject[PNAME]).to.equal(objectFn1);

      const rValue = myObject[PNAME]('a', 'b');

      expect(rValue).to.equal(1);
      notCalled(spy);
      calledOnWith(myObject[PNAME], myObject, ['a', 'b']);
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

      const rValue = myObject2[PNAME]('a', 'b', 'c');

      expect(rValue).to.deep.equal(['a', 'b', 'c']);

      calledOnWith(spy, myObject2, ['a', 'b', 'c'], 'Spy should have been called');
      notCalled(originalFn, 'Original function should be replaced with the Spy, therefore not been called');

      propertyReplacer.restore(myObject2, PNAME);

      myObject2[PNAME] = 5;

      expect(objVar).to.equal(5);
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

      const rValue1 = myObject[PNAME]('a', 'b');
      const rValue2 = myObject.myFunction2('a', 'b', 'c');
      const rValue3 = myObject2.myFunction('a', 'b', 'c', 'd');
      const rValue4 = myObject2.myFunction2('a', 'b', 'c', 'd', 'e');

      expect(rValue1).to.equal(1);
      expect(rValue2).to.equal(1);
      expect(rValue3).to.equal(1);
      expect(rValue4).to.equal(1);

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


  describe('using namespaces', function(){

    afterEach(function(){
      propertyReplacer.restoreNamespace('', true);
    });

    it('should be able to define a namespace', function(){

      propertyReplacer.replace(myObject, PNAME, spy);

      propertyReplacer.setup('myTests');

      const spy2 = getSpy1(3);

      propertyReplacer.replace(myObject, PNAME, spy2);

      propertyReplacer.restoreNamespace();

      expect(myObject[PNAME]).to.equal(spy);

      propertyReplacer.restoreNamespace();

    });

    it('should be able to define 3 namespaces depth and restore all the values', function(){

      propertyReplacer.replace(myObject, PNAME, spy);

      propertyReplacer.setup('myTests');

      const spy2 = getSpy1(3);

      propertyReplacer.replace(myObject, PNAME, spy2);

      propertyReplacer.setup('myTests2');

      const spy3 = getSpy1(3);

      propertyReplacer.replace(myObject, PNAME, spy3);

      propertyReplacer.resetNamespace();
      expect(propertyReplacer.currentNamespace_).to.equal('myTests2');

      expect(myObject[PNAME]).to.equal(spy2);

      propertyReplacer.restoreNamespace('myTests');
      expect(propertyReplacer.currentNamespace_).to.equal('myTests');

      expect(myObject[PNAME]).to.equal(spy2);

      propertyReplacer.restoreNamespace('myTests', true);
      expect(myObject[PNAME]).to.equal(spy);

      propertyReplacer.restoreNamespace('', true);
      expect(propertyReplacer.currentNamespace_).to.equal('');

      expect(myObject[PNAME]).to.equal(originalFn);

    });

    it('should be able to define 3 namespaces depth with different properties and restore all the values', function(){

      propertyReplacer.replace(myObject, PNAME, spy);

      propertyReplacer.setup('myTests');

      const spy2 = getSpy1(3);

      propertyReplacer.replace(myObject, 'myFunction2', spy2);

      propertyReplacer.setup('myTests2');

      const spy3 = getSpy1(3);

      propertyReplacer.replace(myObject, PNAME, spy3);

      expect(myObject['myFunction2']).to.equal(spy2);
      expect(myObject[PNAME]).to.equal(spy3);

      propertyReplacer.resetNamespace();
      expect(propertyReplacer.currentNamespace_).to.equal('myTests2');

      expect(myObject[PNAME]).to.equal(spy);
      expect(myObject['myFunction2']).to.equal(spy2);

      propertyReplacer.restoreNamespace('myTests');
      expect(propertyReplacer.currentNamespace_).to.equal('myTests');

      expect(myObject[PNAME]).to.equal(spy);
      expect(myObject['myFunction2']).to.equal(spy2);

      propertyReplacer.resetNamespace();
      expect(propertyReplacer.currentNamespace_).to.equal('myTests');

      expect(myObject[PNAME]).to.equal(spy);
      expect(myObject['myFunction2']).to.equal(undefined);

    });

    it('should be able to define 3 namespaces depth with different properties and restore all the values to the first one directly', function(){

      propertyReplacer.replace(myObject, PNAME, spy);

      propertyReplacer.setup('myTests');

      const spy2 = getSpy1(3);

      propertyReplacer.replace(myObject, 'myFunction2', spy2);

      propertyReplacer.setup('myTests2');

      const spy3 = getSpy1(3);

      propertyReplacer.replace(myObject, PNAME, spy3);

      expect(myObject['myFunction2']).to.equal(spy2);
      expect(myObject[PNAME]).to.equal(spy3);

      propertyReplacer.restoreNamespace('');

      expect(myObject[PNAME]).to.equal(spy);
      expect(myObject['myFunction2']).to.equal(undefined);

    });

  });
});