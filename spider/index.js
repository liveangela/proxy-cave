const collector = require('./controller/collector');
const validator = require('./controller/validator');
const ipSearcher = require('./controller/ipSearcher');

class Spider {

  injectSocket(io) {
    collector.injectSocket(io);
    validator.injectSocket(io);
    ipSearcher.injectSocket(io);
  }

  start() {
    collector.start();
    validator.start();
    ipSearcher.start();
  }

}

module.exports = new Spider();
