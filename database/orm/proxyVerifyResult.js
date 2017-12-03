const ProxyVerifyResultModel = require('../model/proxyVerifyResult');

class ProxyVerifyResultORM {

  constructor() {
    this.map = null;
  }

  getResultList(proxy) {
    return new Promise((resolve) => {
      ProxyVerifyResultModel.find({
        proxy,
      }).select('result_list').exec().then((res) => {
        return resolve(res.length > 0 ? res[0] : null);
      }).catch((e) => {
        console.error(`[DB]: ProxyVerifyResultORM.getResultList - ${e.message}`);
      });
    });
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

  pickOneProxy(except) {
    return new Promise((resolve) => {
      ProxyVerifyResultModel.find({
        proxy: {
          $nin: except,
        },
        anonymity: {
          $gt: 1,
          $lt: 4,
        },
      }).sort({
        lastpick_time: 1,
        success_count: -1,
      }).select('proxy result_list').limit(1).exec().then((res) => {
        let doc = null;
        if (res.length > 0) {
          doc = res[0];
          doc.lastpick_time = Date.now();
          doc.save().catch((e) => console.error(`[DB]: ProxyVerifyResultORM.pickOneProxy - ${e.message}`));
        }
        resolve(doc);
      }).catch((e) => {
        console.error(`[DB]: ProxyVerifyResultORM.pickOneProxy - ${e.message}`);
      });
    });
  }

  setResultContent(data) {
    const resultContent = {
      verify_result: data.verify_result,
      verify_time: data.verify_time,
    };
    if (undefined !== data.delay) resultContent.delay = data.delay;
    if (undefined !== data.anonymous_level) resultContent.anonymous_level = data.anonymous_level;
    return resultContent;
  }

  setInsertData(data) {
    const resultContent = this.setResultContent(data);
    const res = {
      proxy: data.proxy,
      success_count: data.verify_result ? 1 : 0,
      anonymity: data.anonymous_level || 4,
      result_list: {
        [data.from]: resultContent
      },
    };
    return res;
  }

  setUpdateData(data, doc) {
    let min = doc.anonymity;
    let count = 0;
    doc.result_list[data.from] = this.setResultContent(data); // already update the map
    Object.values(doc.result_list).map((value) => {
      if (undefined !== value.anonymous_level) min = Math.min(value.anonymous_level, min);
      if (value.verify_result) count++;
    });
    doc.anonymity = min;
    doc.success_count = count;
    return doc;
  }

  /**
   * data structure:
   * {
   *    proxy: '...',
   *    from: '...',
   *    verify_result: boolean,
   *    verify_time: ts,
   *    (delay: 120),
   *    (anonymous_level: 1),
   * }
   * @param {Object} data data
   * @returns {Promise} promise
   */
  store(data) {
    return new Promise((resolve) => {
      const insertGroup = [];
      const updateGroup = [];
      data.map((resultSet) => {
        if (this.map[resultSet.proxy]) {
          updateGroup.push(resultSet);
        } else {
          const insertData = this.setInsertData(resultSet);
          this.map[resultSet.proxy] = insertData;
          insertGroup.push(insertData);
        }
      });
      this.saveDB(insertGroup);
      this.updateDB(updateGroup);
      resolve({
        insertCount: insertGroup.length,
        updateCount: updateGroup.length,
      });
    });
  }

  saveDB(insertGroup) {
    ProxyVerifyResultModel.insertMany(insertGroup).then((res) => {
      res.map((each) => {
        this.map[each.proxy] = each;
      });
    }).catch((e) => {
      console.error(`[DB]: ProxyVerifyResultModel.saveDB - ${e.message}`);
    });
  }

  updateDB(updateGroup) {
    updateGroup.map((each) => {
      ProxyVerifyResultModel.findOne({ proxy: each.proxy }).exec().then((doc) => {
        this.setUpdateData(each, doc).save().then((res) => {
          this.map[each.proxy] = res;
        }).catch((e) => console.error(`[DB]: ProxyVerifyResultModel.updateDB - ${e.message}`));
      }).catch((e) => console.error(`[DB]: ProxyVerifyResultModel.updateDB - ${e.message}`));
    });
  }

}

module.exports = new ProxyVerifyResultORM();
