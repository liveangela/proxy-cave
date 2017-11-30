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

  pickOneProxy() {
    return new Promise((resolve) => {
      ProxyVerifyResultModel.find({
        success_count: { // virtual type
          $gt: 0,
        },
        anonymity: { // virtual type
          $gt: 1,
          $lt: 4,
        },
      }).sort({
        success_count: -1,
        update_time: -1,
      }).select('proxy result_list').limit(1).exec().then((res) => {
        return resolve(res.length > 0 ? res[0] : null);
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
      result_list: {
        [data.from]: resultContent
      },
    };
    return res;
  }

  setUpdateData(data) {
    const originResultList = this.map[data.proxy].result_list;
    originResultList[data.from] = this.setResultContent(data); // already update the map
    return {
      condition: { proxy: data.proxy },
      update: { result_list: originResultList },
      opt: { new: true },
    };
  }

  store(data) {
    return new Promise((resolve) => {
      const insertGroup = [];
      const updateGroup = [];
      data.map((resultSet) => {
        if (this.map[resultSet.proxy]) {
          const updateData = this.setUpdateData(resultSet);
          updateGroup.push(updateData);
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
      ProxyVerifyResultModel.findOneAndUpdate(each.condition, each.update, each.opt).exec().then((res) => {
        this.map[each.proxy] = res;
      }).catch((e) => console.error(`[DB]: ProxyVerifyResultModel.updateDB - ${e.message}`));
    });
  }

}

module.exports = new ProxyVerifyResultORM();
