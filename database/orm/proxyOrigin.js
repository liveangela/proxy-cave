const ProxyOriginModel = require('../model/proxyOrigin');

class ProxyOriginORM {

  constructor() {
    // map like { '120.111.234.1:8080': ..., } for comparation
    this.map = null;
  }

  initMap() {
    return new Promise((resolve) => {
      if (this.map) resolve();
      ProxyOriginModel.find({}, { _id: 0 }).exec().then((res) => {
        this.map = {};
        res.map((each) => {
          this.map[each.proxy] = each;
        });
        resolve();
      });
    });
  }

  save(name, data) {
    const ts = Date.now();
    const conditions = [];
    const docs = data.map((proxy) => {
      conditions.push({ proxy });
      const proxySplits = proxy.split(':');
      return {
        proxy,
        host: proxySplits[0],
        port: proxySplits[1],
        create_time: {
          [name]: ts,
        },
        lastverify_time: 0,
      };
    });
    const opts = { upsert: true };
    ProxyOriginModel.updateMany(conditions, docs, opts).exec().then((res) => {
      console.log('The raw response from Mongo was ', res);
    }).catch((e) => {
      console.error(`[DB]: Table ${e.message}`);
    });
  }

}

module.exports = new ProxyOriginORM();
