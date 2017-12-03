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
        success_rate: -1,
        success_count: -1,
      }).select('proxy').limit(1).exec().then((res) => {
        return resolve(res.length > 0 ? res[0] : null);
      }).catch((e) => {
        console.error(`[DB]: ProxyTestResultORM.pickOneProxy - ${e.message}`);
      });
    });
  }

  setInsertDoc(data) {
    const set = {
      proxy: data.proxy,
      target: data.target,
      [data.result ? 'success_count' : 'fail_count']: 1,
      success_rate: data.result ? 1 : 0,
    };
    if (data.verify_hit.length > 0) {
      set.verify_hit_count = {};
      data.verify_hit.map((each) => {
        set.verify_hit_count[each] = 1;
      });
    }
    if (data.verify_use.length > 0) {
      set.verify_use_count = {};
      set.verify_hit_rate = {};
      data.verify_use.map((each) => {
        set.verify_use_count[each] = 1;
        if (set.verify_hit_count && set.verify_hit_count[each]) set.verify_hit_rate[each] = 1;
      });
    }
    if (data.delay) set.delay = data.delay;
    return new ProxyTestResultModel(set);
  }

  setUpdateDoc(doc, data) {
    doc[data.result ? 'success_count' : 'fail_count'] += 1;
    data.verify_hit.map((each) => {
      doc.verify_hit_count[each] += 1;
    });
    data.verify_use.map((each) => {
      doc.verify_use_count[each] += 1;
    });
    doc.success_rate = doc.success_count / (doc.success_count + doc.fail_count);
    Object.keys(doc.verify_hit_rate).map((key) => {
      doc.verify_hit_rate[key] = doc.verify_use_count[key] > 0 ? doc.verify_hit_count[key] / doc.verify_use_count[key] : 0;
    });
    if (data.delay) doc.delay = doc.delay ? Math.floor((doc.delay + data.delay) / 2) : data.delay;
    return doc;
  }

  /**
   * save or update
   * data structure like:
   *  {
   *    proxy: ...,
   *    target: ...,
   *    result: true,
   *    verify_hit: ['mayidaili'],
   *    verify_use: ['mayidaili', 'xdaili'],
   *    (delay: 34),
   *  }
   * @param {Object} data single test result
   * @return {Promise} promise
   */
  store(data) {
    return new Promise((resolve) => {
      ProxyTestResultModel.findOne({
        'proxy': data.proxy,
        'target': data.target,
      }).then((doc) => {
        doc = doc ? this.setUpdateDoc(doc, data) : this.setInsertDoc(data);
        doc.save().then(resolve).catch((e) => console.error(`[DB]: ProxyTestResultORM.store save - ${e.message}`));
      }).catch((e) => {
        console.error(`[DB]: ProxyTestResultORM.store find - ${e.message}`);
      });
    });
  }

}

module.exports = new ProxyTestResultORM();
