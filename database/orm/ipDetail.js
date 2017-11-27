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
        console.error(`[DB]: IpDetailORM.initMap - ${e.message}`);
      });
    });
  }

  injectIp(data) {
    data.map((each, i) => {
      if (this.map[each.ip]) {
        data[i].ip_detail = this.map[each.ip];
      }
    });
  }

  /**
   * insert new data
   * only one type of ip checker exists - 'taobao'
   * @param {Ojbect} data data
   * @returns {Promise} promise
   */
  store(data) {
    return new Promise((resolve) => {
      this.map[data.ip] = data;
      resolve(data.ip);
      IpDetailModel.create(data).then((res) => {
        this.map[res.ip] = res;
      }).catch((e) => {
        console.error(`[DB]: IpDetailORM.save - ${e.message}`);
      });
    });
  }

}

module.exports = new IpDetailORM();
