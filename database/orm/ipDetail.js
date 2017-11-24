const IpDetailModel = require('../model/ipDetail');

class IpDetailORM {

  constructor() {
    // map like { '120.111.234.1': ..., } for comparation
    this.map = null;
  }

  initMap() {
    return new Promise((resolve) => {
      if (this.map) resolve();
      IpDetailModel.find({}, { _id: 0 }).exec().then((res) => {
        this.map = {};
        res.map((each) => {
          this.map[each.ip] = each;
        });
        resolve();
      });
    });
  }

  /**
   * insert new data(s)
   * only one type of ip checker exists - 'taobao'
   * @param {Ojbect | Array} data data or a set of data
   * @returns {Promise} promise
   */
  save(data) {
    if (data instanceof Array) {
      return this.saveMany(data);
    } else {
      return this.saveOne(data);
    }
  }

  saveMany(data) {
    //
  }

  saveOne(data) {
    //
  }

}

module.exports = new IpDetailORM();
