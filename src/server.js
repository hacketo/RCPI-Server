/**
 * Created by hacketo on 17/07/17.
 */

(function() {

    var RCPI = require('./rcpi').RCPI;

    var CFG = {
        use_ws: false,
        udp_port: 9878,
        ws_port: 9877
    };

    var rcpi = new RCPI(CFG);
    rcpi.init();

	function exitHandler(options, err) {
		if (err) {
			console.log(err.stack);
		}
		if (options.exit) {
		    rcpi.clean_exit();
		}
	}

	process.on('exit', exitHandler.bind(null, {
		cleanup: true
	}));
	//catches ctrl+c event
	process.on('SIGINT', exitHandler.bind(null, {
		exit: true,
		cleanup: true
	}));
	//catches uncaught exceptions
	process.on('uncaughtException', exitHandler.bind(null, {
		exit: true
	}));
})();