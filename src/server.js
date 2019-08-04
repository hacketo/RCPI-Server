/**
 * Created by hacketo on 17/07/17.
 */

const util = require('./util');

(function() {

const RCPI = require('./rcpi').RCPI;

const CFG = {
  use_ws: false,
  udp_port: 9878,
  ws_port: 9877,
  mediaDirs: ['/media/pi', '/home/pi/Videos'],
};

const rcpi = new RCPI(CFG);
rcpi.init();

function exitHandler(options, err) {
  if (err) {
    util.error(err.stack);
  }
  if (options.exit) {
    rcpi.clean_exit();
  }
}

process.on('exit', exitHandler.bind(null, {
  cleanup: true,
}));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {
  exit: true,
  cleanup: true,
}));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {
  exit: true,
}));

})();
