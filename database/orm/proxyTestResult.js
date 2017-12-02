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
   *    verify_hit: ['mayidaili']
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
      const update = {
        $inc: countSelector,
      };
      const opt = {
        new: true,
        upsert: true,
      };
      ProxyTestResultModel.findOneAndUpdate(condition, update, opt).then((res) => {
        resolve(res);
      }).catch((e) => {
        console.error(`[DB]: ProxyTestResultORM.store - ${e.message}`);
      });
    });
  }

}

module.exports = new ProxyTestResultORM();
