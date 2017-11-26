const ProxyOriginModel = require('../model/proxyOrigin');

class ProxyOriginORM {

  constructor() {
    // map like { '120.111.234.1:8080': ..., } for comparation
    this.map = null;
  }

  initMap() {
    return new Promise((resolve) => {
      if (this.map) {
        resolve();
      } else {
        ProxyOriginModel.find().exec().then((res) => {
          this.map = {};
          res.map((each) => {
            this.map[each.proxy] = each;
          });
          resolve();
        });
      }
    });
  }

  /**
   * insert or update data into database
   * - Insert a mount of data by one query, while update one by one.
   * - Valid datas should be inserted first, while invalid ones will report error later.
   * - No necessary to wait for updating complete, it can do updates during the time waiting for next collection.
   * - Use placeholder to avoid duplicate inserts, as well as to mark these data not for valification since they actually havent been stored in database yet.
   * @param {String} from from which site
   * @param {Array} data data
   * @returns {Promise} promise
   */
  save(from, data) {
    return new Promise((resolve) => {
      const insertGroup = [];
      const updateGroup = [];
      const ts = Date.now();
      data.map((proxy) => {
        if (this.map[proxy]) {
          if (undefined === this.map[proxy].create_time[from] && undefined === this.map[proxy].placeholder) {
            const condition = { proxy };
            const update = {
              create_time: {
                [from]: ts,
              }
            };
            const opt = { new: true };
            updateGroup.push({
              condition,
              update,
              opt,
              proxy,
            });
          }
        } else {
          const proxySplits = proxy.split(':');
          const insertData = {
            proxy,
            host: proxySplits[0],
            port: proxySplits[1],
            create_time: {
              [from]: ts,
            },
            lastverify_time: 0, // for data cache
            placeholder: 'ready to insert', // to avoid duplicate insert, this will be removed after success insert
          };
          this.map[proxy] = insertData;
          insertGroup.push(insertData);
        }
      });
      updateGroup.map((set) => {
        ProxyOriginModel.findOneAndUpdate(set.condition, set.update, set.opt).exec().then((res) => {
          this.map[set.proxy] = res;
        }).catch((e) => console.error(`[DB]: ${e.message}`));
      });
      // an empty insertGroup will be ok too
      ProxyOriginModel.insertMany(insertGroup, { ordered: false }).then((res) => {
        resolve({
          insertCount: res.length,
          insertFailCount: insertGroup.length - res.length,
          updateCount: updateGroup.length,
          ignoreCount: data.length - insertGroup.length - updateGroup.length,
        });
        res.map((each) => {
          this.map[each.proxy] = each; // remove placeholder
        });
      }).catch((e) => console.error(`[DB]: Failed to insert - ${e.message}`));
    });
  }

}

module.exports = new ProxyOriginORM();
