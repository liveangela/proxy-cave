const ProxyVerifyResultModel = require('../model/proxyVerifyResult');

class ProxyVerifyResultORM {

  constructor() {
    // map like { '120.111.234.1:8080': ..., } for comparation
    this.map = null;
  }

  initMap() {
    return new Promise((resolve) => {
      if (this.map) resolve();
      ProxyVerifyResultModel.find({}, { _id: 0 }).exec().then((res) => {
        this.map = {};
        res.map((each) => {
          this.map[each.proxy] = each;
        });
        resolve();
      });
    });
  }

}

module.exports = new ProxyVerifyResultORM();
