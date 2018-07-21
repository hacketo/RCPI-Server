/**
 * Created by hacketo on 21/07/18.
 */


const chai = require('chai'),
	spies = require('chai-spies'),
	Clients = require('../src/clients').Clients,
	Client = require('../src/client').Client;

chai.use(spies);

const expect = chai.expect;

describe('Clients', function(){

    describe ('Constructor', function(){

        var clients;

        beforeEach(function(){
            clients = new Clients();
        });

        it ('Should initialise properties', function(){
            expect(clients.list, "not a map").to.be.an.instanceOf(Map);
            expect(clients.list.size, "not a map").to.equal(0);
        });


        it ('Sould be able to add clients to a list', function(){
            let c1 = new Client();
            clients.add_client_("0123", c1);
            expect(clients.list.size,"Client not added to the list ?").to.equal(1);
            expect(clients.list.get("0123"), "not same client ?").to.equal(c1);
        });

	    it ('Sould be call send method on clients when broadcasting', function(){
		    let c1 = new Client();
		    clients.add_client_("0123", c1);

		    const spy = chai.spy(c1.send);
		    clients.broadcast('test','test');
		    expect(spy).to.have.been.called;

		    c1.close();
		    clients.broadcast('test','test');
		    expect(spy).to.have.not.been.called;

	    });
    });

});