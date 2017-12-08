const IpDetailModel = require('../model/ipDetail');

class IpDetailORM {

  constructor() {
    this.map = null;
  }

  checkIpExist(ip) {
    return this.map[ip];
  }

  initMap() {
    return new Promise((resolve) => {
      if (this.map) resolve();
      IpDetailModel.find().exec().then((res) => {
        this.map = {};
        res.map((each) => {
          this.map[each.ip] = each;
        });
        resolve();
      }).catch((e) => {
        this.logger.error(`[DB]: IpDetailORM.initMap - ${e.message}`);
      });
    });
  }

  injectLogger(logger) {
    this.logger = logger;
  }

  /**
   * insert new data
   * only one type of ip checker exists - 'taobao'
   * @param {Array} data data
   * @returns {Promise} promise
   */
  store(data) {
    return new Promise((resolve) => {
      const insertGroup = [];
      data.map((each) => {
        if (each.ip && undefined === this.map[each.ip]) {
          this.map[each.ip] = each;
          insertGroup.push(each);
        }
      });
      resolve({
        insertCount: insertGroup.length,
        ignoreCount: data.length - insertGroup.length,
      });
      IpDetailModel.insertMany(insertGroup, { ordered: false }).then((res) => {
        res.map((each) => {
          this.map[each.ip] = each;
        });
      }).catch((e) => {
        this.logger.error(`[DB]: IpDetailORM.save - ${e.message}`);
      });
    });
  }

}

module.exports = new IpDetailORM();
