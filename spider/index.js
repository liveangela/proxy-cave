const collector = require('./controller/collector');
const validator = require('./controller/validator');
const ipSearcher = require('./controller/ipSearcher');

class Spider {

  injectLogger(logger) {
    collector.injectLogger(logger);
    validator.injectLogger(logger);
    ipSearcher.injectLogger(logger);
  }

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
