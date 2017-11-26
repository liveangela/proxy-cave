const collector = require('./controller/collector');
const validator = require('./controller/validator');
const ipSearcher = require('./controller/ipSearcher');

class Spider {

  start() {
    collector.start();
    validator.start();
    ipSearcher.start();
  }

}

module.exports = new Spider();
