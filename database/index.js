const config = require('./config.json');
const ipDetailORM = require('./orm/ipDetail');
const proxyOriginORM = require('./orm/proxyOrigin');
const proxyVerifyResultORM = require('./orm/proxyVerifyResult');
const proxyTestResultORM = require('./orm/proxyTestResult');
const mongoose = require('mongoose');

class Database {

  constructor() {
    mongoose.Promise = global.Promise; // Use native promises
    this.db = null;
  }

  checkIpExist(ip) {
    return ipDetailORM.checkIpExist(ip);
  }

  connect() {
    return new Promise((resolve) => {
      const passport = (config.user && config.pass) ? `${config.user}:${config.pass}@` : '';
      const dbtarget = config.host + (config.port ? ':' + config.port : '');
      const dbpath = `mongodb://${passport}${dbtarget}/${config.dbname}`;
      mongoose.connect(dbpath, config.connectOption);
      let db = mongoose.connection;
      db.on('error', () => {
        console.error('[DB]: Main.connect - connection failed!');
      });
      db.on('open', () => {
        this.db = db;
        resolve();
        console.log(`[DB]: Connected to "${dbpath}", waiting for map init...`);
      });
      db.on('disconnected', () => {
        console.error('[DB]: Main.connect - disconnected!');
      });
    });
  }

  getOriginProxy(count) {
    return proxyOriginORM.getResultForVarify(count);
  }

  getStats() {
    return proxyOriginORM.getStats();
  }

  initMap() {
    return new Promise((resolve) => {
      Promise.all([
        proxyOriginORM.initMap(),
        proxyVerifyResultORM.initMap(),
        ipDetailORM.initMap(),
        // proxyTestResultORM.initMap(),
      ]).then(resolve).catch((e) => {
        console.error(`[DB]: Main.initMap - ${e.message}`);
      });
    });
  }

  pickOneProxy(target) {
    return new Promise(async (resolve) => {
      let temp = null;
      temp = await proxyTestResultORM.pickOneProxy(target);
      if (null === temp) {
        temp = await proxyVerifyResultORM.pickOneProxy();
      } else {
        const tempResultListObj = await proxyVerifyResultORM.getResultList(temp.proxy);
        temp.result_list = tempResultListObj.result_list;
      }
      resolve(temp); // may be null
    });
  }

  storeIpDetail(data) {
    return ipDetailORM.store(data);
  }

  storeProxyOrigin(data) {
    return proxyOriginORM.store(data);
  }

  storeVerifyResult(data) {
    return proxyVerifyResultORM.store(data);
  }

  storeTestResult(data) {
    return proxyTestResultORM.store(data);
  }

  start() {
    return new Promise(async (resolve) => {
      await this.connect();
      const now = Date.now();
      await this.initMap();
      const timespan = Date.now() - now;
      resolve();
      console.log(`[DB]: Map init done in ${timespan}ms`);
    });
  }

  updateVerifyTime(proxy) {
    proxyOriginORM.updateVerifyTime(proxy);
  }
}

module.exports = new Database();
