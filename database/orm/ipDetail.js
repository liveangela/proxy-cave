const IpDetailModel = require('../model/ipDetail');

class IpDetailORM {

  constructor() {
    this.map = null;
  }

  checkIpExist(ip) {
    return this.map[ip] ? true : false;
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
        console.error(`[DB]: IpDetailORM.initMap - ${e.message}`);
      });
    });
  }

  /**
   * insert new data
   * only one type of ip checker exists - 'taobao'
   * @param {Ojbect} data data
   * @returns {Promise} promise
   */
  save(data) {
    return new Promise((resolve) => {
      IpDetailModel.create(data).then((res) => {
        this.map[res.ip] = res;
        resolve(res.ip);
      }).catch((e) => {
        console.error(`[DB]: IpDetailORM.save - ${e.message}`);
      });
    });
  }

}

module.exports = new IpDetailORM();
