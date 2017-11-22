const config = require('./config.json');
const ipDetailORM = require('./orm/ipDetail');
const proxyOriginORM = require('./orm/proxyOrigin');
const proxyVerifyResultORM = require('./orm/proxyVerifyResult');
const mongoose = require('mongoose');

class Database {

  constructor() {
    this.db = null;
  }

  connect() {
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
      console.log(`[DB]: Connected to "${dbpath}"`);
    });
    db.on('disconnected', () => {
      console.error('[DB]: Disconnected! Try to reconnect...');
      this.connect();
    });
  }

  start() {
    this.connect();
  }
}

module.exports.database = new Database();
module.exports.orm = {
  ipDetail: ipDetailORM,
  proxyOrigin: proxyOriginORM,
  proxyVerifyResult: proxyVerifyResultORM,
};
