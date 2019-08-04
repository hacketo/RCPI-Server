/**
 * Created by hacketo on 21/07/18.
 */


const chai = require('chai');
const spies = require('chai-spies');
const RCPI = require('../src/rcpi').RCPI;

chai.use(spies);

const expect = chai.expect;

describe('RCPI', function(){

  describe('Constructor', function(){
    const cfg = {
      use_ws: false,
      udp_port: 9878,
      ws_port: 9877,
      mediaDirs: ['/media/pi', '/home/pi/Videos'],
    };

    const rcpi = new RCPI(cfg);
  });

});
