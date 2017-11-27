const ProxyVerifyResultModel = require('../model/proxyVerifyResult');

class ProxyVerifyResultORM {

  constructor() {
    this.map = null;
  }

  initMap() {
    return new Promise((resolve) => {
      if (this.map) resolve();
      ProxyVerifyResultModel.find().exec().then((res) => {
        this.map = {};
        res.map((each) => {
          this.map[each.proxy] = each;
        });
        resolve();
      }).catch((e) => {
        console.error(`[DB]: ProxyVerifyResultORM.initMap - ${e.message}`);
      });
    });
  }

}

module.exports = new ProxyVerifyResultORM();
