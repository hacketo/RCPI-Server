
const chai = require('chai');

if (!global.SINON_CHAI){
  const sinonChai = require('sinon-chai');
  chai.use(sinonChai);
  global.SINON_CHAI = true;
}

const util = require('../src/util');

const PropertyReplacer = require('./property_replacer').PropertyReplacer;

let propertyReplacer = new PropertyReplacer();

global.gPropertyReplacer = propertyReplacer;

before(function(){
  propertyReplacer.replace(util, 'DEBUG', false);
  propertyReplacer.replace(util, 'LOG', false);
});

after(function(){
  propertyReplacer.restoreAll();
});
