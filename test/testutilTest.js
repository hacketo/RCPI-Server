/**
 * Created by hacketo on 04/08/19.
 */

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');

chai.use(sinonChai);

const should = chai.should();
const expect = chai.expect;


const util = require('./util');
const PropertyReplacer = util.PropertyReplacer;

const getSpyArgs = function(){
  return sinon.spy(function(){
    if (arguments.length === 1){
      return arguments[0];
    }
    return Array.prototype.slice.call(arguments);
  });
};

const getSpy1 = function(){
  return sinon.spy(function(){
    return 1;
  });
};

describe('PropertyReplacer', function(){

  let propertyReplacer, myObject, spy, originalFn, originalCopy_;

  before(function(){
    propertyReplacer = new PropertyReplacer();
  })

  beforeEach(function(){

    expect(propertyReplacer.properties_.size).to.equal(0);

    originalFn = getSpy1();

    myObject = {
      myFunction : originalFn
    };

    originalCopy_ = originalFn;

    spy = getSpyArgs();

  });

  afterEach(function(){

    let props = propertyReplacer.properties_.keys();

    let originals = {};

    for (let i = 0, len = props.length; i < len; i++) {
      const property = propertyReplacer.properties_.get(props[i]);
      originals[props[i]] = property;
    }

    propertyReplacer.restoreAll();

    for (let key in originals){
      if (!originals.hasOwnProperty(key)){
        continue;
      }

      const prop = originals[key];
      expect(prop.object[prop.property]).to.deep.equal(prop.value);
    }

  });

  describe('construct', function(){
    it('should have a list of replaced properties', function(){
      expect(propertyReplacer.properties_).to.be.instanceOf(Map);
    });

  });

  describe('#replace add replacer', function(){

    it('should be able to add a replacer for a function : REPLACE', function(){

      propertyReplacer.replace(myObject, 'myFunction', spy, PropertyReplacer.TYPE.REPLACE);

      return Promise.resolve(myObject.myFunction('a', 'b', 'c')).then((r) => {
        expect(r).to.deep.equal(['a', 'b', 'c']);

        expect(spy).to.have.been.called;
        expect(originalFn).to.not.have.been.called;
        expect(spy).to.have.been.calledWith('a', 'b', 'c');
      });
    });

    it('should be able to add a replacer for a function : AFTER', function(){

      propertyReplacer.replace(myObject, 'myFunction', spy, PropertyReplacer.TYPE.AFTER);

      return Promise.resolve(myObject.myFunction('a', 'b', 'c')).then((r) => {
        expect(r).to.equal(1);

        expect(originalFn).to.have.been.called;
        expect(originalFn).to.have.been.calledWith('a', 'b', 'c');

        expect(spy).to.have.been.called;
        expect(spy).to.have.been.calledWith(1);

        expect(originalFn, 'Original function should have been called before').to.have.been.calledBefore(spy);
      });
    });

    it('should be able to add a replacer for a function : BEFORE', function(){

      propertyReplacer.replace(myObject, 'myFunction', spy, PropertyReplacer.TYPE.BEFORE);

      return Promise.resolve(myObject.myFunction('a', 'b')).then((r) => {
        expect(r).to.equal(1);

        expect(originalFn).to.have.been.called;
        expect(originalFn).to.have.been.calledWith('a', 'b');

        expect(spy).to.have.been.called;
        expect(spy).to.have.been.calledWith('a', 'b');

        expect(spy, 'Spy function should have been called before').to.have.been.calledBefore(originalFn);
      });
    });
  });

  describe('#replace replace replacer', function(){

    it('should be able to replace a replacer when a new one is added on the same property', function(){

      let spy2 = getSpyArgs();

      propertyReplacer.replace(myObject, 'myFunction', spy);
      propertyReplacer.replace(myObject, 'myFunction', spy2);

      return Promise.resolve(myObject.myFunction('a', 'b')).then((r) => {
        expect(r).to.deep.equal(['a', 'b']);
        expect(spy).to.not.have.been.called;
        expect(spy2).to.have.been.called;
        expect(spy2).to.have.been.calledWith('a', 'b');
      });

    });

    it('should be able to remove a replacer and restore to its original state', function(){

      const objectFn1 = myObject.myFunction;

      propertyReplacer.replace(myObject, 'myFunction', spy, PropertyReplacer.TYPE.AFTER);
      propertyReplacer.restore(myObject, 'myFunction');

      // Default value
      expect(myObject.myFunction).to.equal(objectFn1);

      return Promise.resolve(myObject.myFunction('a', 'b')).then((r) => {
        expect(r).to.equal(1);
        expect(spy).to.not.have.been.called;

        expect(myObject.myFunction).to.have.been.called;
        expect(myObject.myFunction).to.have.been.calledWith('a', 'b');
      });

    });

    it('should be able to restore all replacers', function(){

      myObject = {
        myFunction:getSpy1(),
        myFunction2:getSpy1(),
      };
      const myObject2 = {
        myFunction:getSpy1(),
        myFunction2:getSpy1(),
      };

      let spy2 = getSpyArgs();
      let spy3 = getSpyArgs();
      let spy4 = getSpyArgs();

      const objectFn1 = myObject.myFunction;
      const objectFn2 = myObject.myFunction2;
      const object2Fn1 = myObject2.myFunction;
      const object2Fn2 = myObject2.myFunction2;

      propertyReplacer.replace(myObject, 'myFunction', spy, 1);
      propertyReplacer.replace(myObject, 'myFunction2', spy2, 1);
      propertyReplacer.replace(myObject2, 'myFunction', spy3, 1);
      propertyReplacer.replace(myObject2, 'myFunction2', spy4, 1);

      propertyReplacer.restoreAll();

      return Promise.all([
        myObject.myFunction('a', 'b'),
        myObject.myFunction2('a', 'b', 'c'),
        myObject2.myFunction('a', 'b', 'c', 'd'),
        myObject2.myFunction2('a', 'b', 'c', 'd', 'e'),
      ]).then((r) => {
        expect(r).to.deep.equal([1, 1, 1, 1]);
        expect(spy).to.not.have.been.called;
        expect(spy2).to.not.have.been.called;
        expect(spy3).to.not.have.been.called;
        expect(spy4).to.not.have.been.called;

        expect(myObject.myFunction).to.equal(objectFn1);
        expect(myObject.myFunction2).to.equal(objectFn2);
        expect(myObject2.myFunction).to.equal(object2Fn1);
        expect(myObject2.myFunction2).to.equal(object2Fn2);

        expect(objectFn1).to.have.been.called;
        expect(objectFn1).to.have.been.calledWith('a', 'b');
        expect(objectFn2).to.have.been.called;
        expect(objectFn2).to.have.been.calledWith('a', 'b', 'c');
        expect(object2Fn1).to.have.been.called;
        expect(object2Fn1).to.have.been.calledWith('a', 'b', 'c', 'd');
        expect(object2Fn2).to.have.been.called;
        expect(object2Fn2).to.have.been.calledWith('a', 'b', 'c', 'd', 'e');
      });
    });
  });
});
