/**
 * Created by hacketo on 21/07/18.
 */

var expect = require('chai').expect;

var Client = require('../src/client').Client;


describe('Client', function(){

	describe ('Constructor', function(){

		var client;

		beforeEach(function(){
			client = new Client();
		});

		it ('Should initialise properties', function(){
			expect(client, "no lastTimePing").to.have.a.property('lastTimePing').that.is.a('number');
			expect(client.closed, "closed should be false..").to.be.false;
		});


		it ('Sould update last time ping on ping', function(){
			let d1 = +new Date;
			client.ping();
			expect(client.lastTimePing).to.equal(d1);
		});

		it ('Sould set the status closed true', function(){
			let d1 = +new Date;
			expect(client.closed).to.be.false;
			client.close();
			expect(client.closed).to.equal(d1);
		});

	});

});