const collector = require('./controller/collector');
const validator = require('./controller/validator');
const ipSearcher = require('./controller/ipSearcher');

class Spider {

  start() {
    collector.start();
    validator.start();
    ipSearcher.start();
  }

  getCollectorResult() {
    return collector.getResult();
  }

  getValidatorResult() {
    return validator.getResult();
  }

  getIpDetailResult() {
    return ipSearcher.getResult();
  }

}

module.exports = new Spider();
