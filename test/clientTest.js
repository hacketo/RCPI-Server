/**
 * Created by hacketo on 21/07/18.
 */

const expect = require('chai').expect;

const Client = require('../src/client').Client;


describe('Client', function(){

  describe('Constructor', function(){

    let client;

    beforeEach(function(){
      client = new Client();
    });

    it('Should initialise properties', function(){
      expect(client, 'no lastTimePing').to.have.a.property('lastTimePing').that.is.a('number');
      expect(client.closed, 'closed should be false..').to.be.false;
    });


    it('Sould update last time ping on ping', function(){
      const d1 = +new Date();
      client.ping();
      expect(client.lastTimePing).to.equal(d1);
    });

    it('Sould set the status closed true', function(){
      const d1 = +new Date();
      expect(client.closed).to.be.false;
      client.close();
      expect(client.closed).to.equal(d1);
    });

  });

});
