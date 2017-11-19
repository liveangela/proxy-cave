const collect = require('./controller/collect');

class Spider {

  start() {
    collect.start();
  }

  getCollectResult() {
    return collect.getResult();
  }

}

module.exports = new Spider();
