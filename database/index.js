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

  initMap() {
    return new Promise((resolve) => {
      Promise.all([
        proxyOriginORM.initMap(),
        proxyVerifyResultORM.initMap(),
        ipDetailORM.initMap()
      ]).then(resolve);
    });
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

module.exports.database = new Database();
module.exports.ipDetailORM = ipDetailORM;
module.exports.proxyOriginORM = proxyOriginORM;
module.exports.proxyVerifyResultORM = proxyVerifyResultORM;
