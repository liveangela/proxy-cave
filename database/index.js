const config = require('./config.json');
const ipDetailORM = require('./orm/ipDetail');
const proxyOriginORM = require('./orm/proxyOrigin');
const proxyVerifyResultORM = require('./orm/proxyVerifyResult');
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
        console.error('[DB]: Connection failed!');
      });
      db.on('open', () => {
        this.db = db;
        resolve();
        console.log(`[DB]: Connected to "${dbpath}", waiting for map init...`);
      });
      db.on('disconnected', () => {
        console.error('[DB]: Disconnected!');
      });
    });
  }

  getOriginProxy(count) {
    return proxyOriginORM.getResultForVarify(count);
  }

  initMap() {
    return new Promise((resolve) => {
      Promise.all([
        proxyOriginORM.initMap(),
        proxyVerifyResultORM.initMap(),
        ipDetailORM.initMap()
      ]).then(resolve).catch(console.error);
    });
  }

  saveIpDetail(data) {
    return ipDetailORM.save(data);
  }

  saveProxyOrigin(data) {
    return proxyOriginORM.save(data);
  }

  start() {
    return new Promise(async (resolve) => {
      await this.connect();
      await this.initMap();
      resolve();
      console.log(`[DB]: map init done`);
    });
  }
}

module.exports = new Database();
