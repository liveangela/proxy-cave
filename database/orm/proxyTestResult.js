const ProxyTestResultModel = require('../model/proxyTestResult');

class ProxyTestResultORM {

  constructor() {
    this.map = null; // array
  }

  // checkExistsAndModifyMap(data) {
  //   let res = false;
  //   const t = this.map[data.proxy];
  //   if (t) {
  //     const list = t.result_list;
  //     for (let i = list.length - 1; i >= 0; i--) {
  //       if (list[i].url === data.url) {
  //         this.updateMap(list, data);
  //         res = true;
  //         break;
  //       }
  //     }
  //   } else {
  //     this.saveMap(data);
  //   }
  //   return res;
  // }

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

  pickOneProxy(target) {
    return new Promise((resolve) => {
      ProxyTestResultModel.find({ target }).sort({
        rate: -1, // virtual type
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
      try {
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
          console.log('[DB]: ProxyTextResultORM-store res is');
          console.log(res);
          resolve(res[0]);
        }).catch((e) => {
          console.error(`[DB]: ProxyTestResultORM.store - ${e.message}`);
        });
      } catch (err) {
        console.error(err);
      }
    });
  }

}

module.exports = new ProxyTestResultORM();
