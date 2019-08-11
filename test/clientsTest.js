/**
 * Created by hacketo on 21/07/18.
 */


const chai = require('chai');
const sinon = require('sinon');
const expect = chai.expect;

const Clients = require('../src/clients').Clients;
const Client = require('../src/client').Client;


describe('Clients', function(){

  describe('Constructor', function(){

    let clients;

    beforeEach(function(){
      clients = new Clients();
    });

    it('Should initialise properties', function(){
      expect(clients.list, 'not a map')
        .to.be.an.instanceOf(Map);
      expect(clients.list.size, 'not a map')
        .to.equal(0);
    });


    it('Sould be able to add clients to a list', function(){
      const c1 = new Client();
      clients.add_client_('0123', c1);

      expect(clients.list.size, 'Client not added to the list ?')
        .to.equal(1);
      expect(clients.list.get('0123'), 'not same client ?')
        .to.equal(c1);
    });

    it('Sould be call send method on clients when broadcasting', function(){
      const c1 = new Client();
      clients.add_client_('0123', c1);

      const spy = sinon.spy(c1.send);
      clients.broadcast('test', 'test');
      expect(spy).to.have.been.called;

      c1.close();
      clients.broadcast('test', 'test');
      expect(spy).to.have.not.been.called;

    });
  });

});
