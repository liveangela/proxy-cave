const ProxyVerifyResultModel = require('../model/proxyVerifyResult');

class ProxyVerifyResultORM {

  constructor() {
    this.map = null;
  }

  getResultContent(data) {
    const resultContent = {
      verify_result: data.verify_result,
      verify_time: data.verify_time,
    };
    if (undefined !== data.delay) resultContent.delay = data.delay;
    if (undefined !== data.anonymous_level) resultContent.anonymous_level = data.anonymous_level;
    return resultContent;
  }

  getInsertData(data) {
    const resultContent = this.getResultContent(data);
    const res = {
      proxy: data.proxy,
      result_list: {
        [data.from]: resultContent
      },
    };
    if (undefined !== data.ip_detail) resultContent.ip_detail = data.ip_detail;
    return res;
  }

  getUpdateData(data) {
    const originResultList = this.map[data.proxy].result_list;
    originResultList[data.from] = this.getResultContent(data); // already update the map
    return {
      condition: { proxy: data.proxy },
      update: { result_list: originResultList },
      opt: { new: true },
    };
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

  store(data) {
    return new Promise((resolve) => {
      const insertGroup = [];
      const updateGroup = [];
      data.map((resultSet) => {
        if (this.map[resultSet.proxy]) {
          const updateData = this.getUpdateData(resultSet);
          updateGroup.push(updateData);
        } else {
          const insertData = this.getInsertData(resultSet);
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
