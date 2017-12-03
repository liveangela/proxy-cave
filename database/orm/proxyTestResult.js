const ProxyTestResultModel = require('../model/proxyTestResult');

class ProxyTestResultORM {

  constructor() {
    this.map = null; // array
  }

  initMap() {
    return new Promise((resolve) => {
      if (this.map) resolve();
      ProxyTestResultModel.find().exec().then((res) => {
        this.map = res;
        resolve();
      }).catch((e) => {
        console.error(`[DB]: ProxyTestResultORM.initMap - ${e.message}`);
      });
    });
  }

  pickOneProxy(target, except) {
    return new Promise((resolve) => {
      ProxyTestResultModel.find({
        target,
        success_count: {
          $gt: 0,
        },
        proxy: {
          $nin: except,
        },
      }).sort({
        success_count: -1,
      }).select('proxy').limit(1).exec().then((res) => {
        return resolve(res.length > 0 ? res[0] : null);
      }).catch((e) => {
        console.error(`[DB]: ProxyTestResultORM.pickOneProxy - ${e.message}`);
      });
    });
  }

  /**
   * save or update
   * data structure like:
   *  {
   *    proxy: ...,
   *    target: ...,
   *    result: true,
   *    verify_hit: ['mayidaili'],
   *    (delay: 34),
   *  }
   * @param {Object} data single test result
   * @return {Promise} promise
   */
  store(data) {
    return new Promise((resolve) => {
      const condition = {
        'proxy': data.proxy,
        'target': data.target,
      };
      const countSelector = {};
      countSelector[data.result ? 'success_count' : 'fail_count'] = 1;
      data.verify_hit.map((each) => {
        countSelector['verify_hit_count.' + each] = 1;
      });
      ProxyTestResultModel.findOne(condition).then((doc) => {
        if (doc) {
          Object.keys(countSelector).map((key) => {
            doc[key] += 1;
          });
          doc.success_rate = doc.success_count / (doc.success_count + doc.fail_count);
          if (data.delay) doc.delay = Math.floor((doc.delay + data.delay) / 2);
        } else {
          const other = {
            success_rate: data.result ? 1 : 0,
          };
          if (data.delay) other.delay = data.delay;
          doc = new ProxyTestResultModel(Object.assign(condition, countSelector, other));
        }
        doc.save().then(resolve).catch((e) => console.error(`[DB]: ProxyTestResultORM.store - ${e.message}`));
      }).catch((e) => {
        console.error(`[DB]: ProxyTestResultORM.store - ${e.message}`);
      });
    });
  }

}

module.exports = new ProxyTestResultORM();
