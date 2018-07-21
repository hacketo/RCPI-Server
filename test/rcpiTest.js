/**
 * Created by hacketo on 21/07/18.
 */


const chai = require('chai'),
	spies = require('chai-spies'),
	RCPI = require('../src/rcpi').RCPI;

chai.use(spies);

const expect = chai.expect;

describe('RCPI', function(){

	describe ('Constructor', function(){
		const cfg = {
			use_ws: false,
			udp_port: 9878,
			ws_port: 9877,
			mediaDirs : ["/media/pi", "/home/pi/Videos"]
		};

		let rcpi = new RCPI(cfg);
	});

});