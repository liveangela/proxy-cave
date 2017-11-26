const ProxyOriginModel = require('../model/proxyOrigin');

class ProxyOriginORM {

  constructor() {
    this.map = null;
  }

  getUpdateParams(from, proxy) {
    if (undefined === this.map[proxy].create_time[from]) {
      const condition = { proxy };
      const update = {
        create_time: {
          [from]: Date.now(),
        }
      };
      const opt = { new: true };
      return {
        condition,
        update,
        opt,
        proxy,
      };
    }
    return null;
  }

  getResultForVarify(count) {
    return ProxyOriginModel.find().sort({ lastverify_time: 'asc' }).limit(count).exec();
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
        }).catch(console.error);
      }
    });
  }

  /**
   * insert or update data into database
   * - Insert a mount of data by one query, while update one by one.
   * - Valid datas should be inserted first, while invalid ones will report error later.
   * - No necessary to wait for updating complete, it can do updates during the time waiting for next collection.
   * @param {Array} data data
   * @returns {Promise} promise
   */
  save(data) {
    return new Promise((resolve) => {
      const insertGroup = [];
      const updateGroup = [];
      data.map((proxySet) => {
        if (this.map[proxySet.proxy]) {
          const updateParams = this.getUpdateParams(proxySet.from, proxySet.proxy);
          if (updateParams) updateGroup.push(updateParams);
        } else {
          insertGroup.push(proxySet);
        }
      });
      updateGroup.map((eachParams) => this.update(eachParams));
      // an empty insertGroup will be ok too
      ProxyOriginModel.insertMany(insertGroup, { ordered: false }).then((res) => {
        resolve({
          insertCount: res.length,
          insertToUpdateCount: insertGroup.length - res.length,
          updateCount: updateGroup.length,
          ignoreCount: data.length - insertGroup.length - updateGroup.length,
        });
        res.map((each) => {
          this.map[each.proxy] = each;
        });
      }).catch((e) => {
        e.writeErrors.map((writeErr) => {
          if (11000 === writeErr.code) {
            const op = writeErr.getOperation();
            this.update({
              condition: op.proxy,
              update: { create_time: op.create_time },
              opt: { new: true },
            });
            console.warn(`[DB]: Insert action change to update for "${op.proxy}"`);
          } else {
            console.error(`[DB]: ${writeErr.errmsg}`);
          }
        });
      });
    });
  }

  update(params) {
    ProxyOriginModel.findOneAndUpdate(params.condition, params.update, params.opt).exec().then((res) => {
      this.map[params.proxy] = res;
    }).catch((e) => console.error(`[DB]: ${e.message}`));
  }

}

module.exports = new ProxyOriginORM();
