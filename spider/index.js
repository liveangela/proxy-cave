const collector = require('./controller/collector');
const validator = require('./controller/validator');

class Spider {

  start() {
    collector.start();
    validator.start();
  }

  getCollectorResult() {
    return collector.getResult();
  }

  getValidatorResult() {
    return validator.getResult();
  }

}

module.exports = new Spider();
