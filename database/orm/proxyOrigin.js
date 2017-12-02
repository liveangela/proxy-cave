const ProxyOriginModel = require('../model/proxyOrigin');

class ProxyOriginORM {

  constructor() {
    this.map = null;
  }

  getUpdateParams(from, proxy) {
    const cache = this.map[proxy].create_time;
    if (undefined === cache[from]) {
      const condition = { proxy };
      const update = {
        create_time: Object.assign(cache, {
          [from]: Date.now()
        })
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

  getStats() {
    return new Promise((resolve) => {
      ProxyOriginModel.aggregate().lookup({
        from: 'proxy_verify_results',
        localField: 'proxy',
        foreignField: 'proxy',
        as: 'result'
      }).lookup({
        from: 'ip_details',
        localField: 'host',
        foreignField: 'ip',
        as: 'ip_detail'
      }).match({
        ip_detail: {
          $ne: []
        },
      }).exec().then((res) => {
        resolve(res);
      }).catch((e) => {
        console.error(`[DB]: ProxyOriginORM.getStats - ${e.message}`);
      });
    });
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
        }).catch((e) => {
          console.error(`[DB]: ProxyOriginORM.initMap - ${e.message}`);
        });
      }
    });
  }

  /**
   * insert or update data
   * - Insert a mount of data by one query, while update one by one.
   * - Failed ones will be thrown out.
   * - No necessary to wait for updating complete,
   *   it can do updates during the time waiting for next collection.
   * data structure
   * {
   *    proxy,
   *    host,
   *    port,
   *    create_time: { [name]: ts }
   *    from,
   * }
   * @param {Array} data data
   * @returns {Promise} promise
   */
  store(data) {
    return new Promise((resolve) => {
      const insertGroup = [];
      const updateGroup = [];
      data.map((proxySet) => {
        if (this.map[proxySet.proxy]) {
          const updateParams = this.getUpdateParams(proxySet.from, proxySet.proxy);
          if (updateParams) {
            this.map[proxySet.proxy].create_time = updateParams.update.create_time;
            updateGroup.push(updateParams);
          }
        } else {
          this.map[proxySet.proxy] = proxySet; // save to cache immediately so as to prevent self duplication
          insertGroup.push(proxySet);
        }
      });
      this.saveDB(insertGroup);
      this.updateDB(updateGroup);
      resolve({
        insertCount: insertGroup.length,
        updateCount: updateGroup.length,
        ignoreCount: data.length - insertGroup.length - updateGroup.length,
      });
    });
  }

  saveDB(insertGroup) {
    // an empty insertGroup will be ok too
    ProxyOriginModel.insertMany(insertGroup, { ordered: false }).then((res) => {
      res.map((each) => {
        this.map[each.proxy] = each;
      });
    }).catch((e) => {
      let writeErrors = [];
      e.writeErrors ? writeErrors = e.writeErrors : writeErrors.push(e);
      writeErrors.map((writeErr) => {
        if (11000 === writeErr.code) {
          const op = writeErr.getOperation();
          const originContent = JSON.stringify(this.map[op.proxy].create_time);
          const thisContent = JSON.stringify(op.create_time);
          console.warn(`[DB]: ProxyOriginORM.saveDB - "${op.proxy}" duplicate, origin as ${originContent}, new as ${thisContent}`);
        } else {
          console.error(`[DB]: ProxyOriginORM.saveDB - ${writeErr.errmsg}`);
        }
      });
    });
  }

  updateDB(updateGroup) {
    updateGroup.map((each) => {
      ProxyOriginModel.findOneAndUpdate(each.condition, each.update, each.opt).exec().then((res) => {
        this.map[each.proxy] = res;
      }).catch((e) => console.error(`[DB]: ProxyOriginORM.updateDB- ${e.message}`));
    });
  }

  updateVerifyTime(proxy) {
    const ts = Date.now();
    this.map[proxy].lastverify_time = ts;
    ProxyOriginModel.findOneAndUpdate({ proxy }, {
      lastverify_time: ts
    }, { new: true }).exec().then((res) => {
      this.map[proxy] = res;
    }).catch((e) => console.error(`[DB]: ProxyOriginORM.updateVerifyTime - ${e.message}`));
  }

}

module.exports = new ProxyOriginORM();
