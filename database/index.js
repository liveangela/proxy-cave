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

  connect() {
    return new Promise((resolve) => {
      const passport = (config.user && config.pass) ? `${config.user}:${config.pass}@` : '';
      const dbtarget = config.host + (config.port ? ':' + config.port : '');
      const dbpath = `mongodb://${passport}${dbtarget}/${config.dbname}`;
      mongoose.connect(dbpath, config.connectOption);
      let db = mongoose.connection;
      db.on('error', () => {
        this.logger.error('[DB]: Main.connect - connection failed!');
      });
      db.on('open', () => {
        this.db = db;
        resolve();
        this.logger.info(`[DB]: Connected to "${dbpath}", waiting for map init...`);
      });
      db.on('disconnected', () => {
        this.logger.error('[DB]: Main.connect - disconnected!');
      });
    });
  }

  getOriginProxy(count, isForIpdetail) {
    let res;
    if (isForIpdetail) {
      const exceptArray = ipDetailORM.getExistIp();
      res = proxyOriginORM.getResultForIpdetail(exceptArray);
    } else {
      res = proxyOriginORM.getResultForVarify(count);
    }
    return res;
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
        proxyTestResultORM.initMap(),
      ]).then(resolve).catch((e) => {
        this.logger.error(`[DB]: Main.initMap - ${e.message}`);
      });
    });
  }

  injectLogger(logger) {
    this.logger = logger;
    ipDetailORM.injectLogger(logger);
    proxyOriginORM.injectLogger(logger);
    proxyVerifyResultORM.injectLogger(logger);
    proxyTestResultORM.injectLogger(logger);
  }

  pickOneProxy(target, except = []) {
    return new Promise(async (resolve) => {
      let temp = null;
      temp = await proxyVerifyResultORM.pickOneProxy(except);
      if (null === temp) {
        temp = await proxyTestResultORM.pickOneProxy(target, except);
        if (temp && temp.proxy) {
          const tempResultListObj = await proxyVerifyResultORM.getResultList(temp.proxy);
          temp.result_list = tempResultListObj.result_list;
        } else {
          temp = null;
        }
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
      this.logger.info(`[DB]: Map init done in ${timespan}ms`);
    });
  }

}

module.exports = new Database();
