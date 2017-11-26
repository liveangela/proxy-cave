const config = require('../config/ipdetail');
const dispatcher = require('./dispatcher');
const util = require('../util');
const database = require('../../database');

class IpSearcher {

  constructor() {
    this.cfg = config;
    this.origin = [];
  }

  loop() {
    if (this.origin.length > 0) {
      const ip = this.origin.shift();
      if (!database.checkIpExist(ip)) {
        this.cfg.option.qs.ip = ip;
        dispatcher.sendRequest(this.cfg.option).then((body) => this.storeData(body)).catch((e) => {
          console.error(`[IPsearcher]: Failed to request data - ${e}`);
        });
      } else {
        this.loop();
      }
    } else {
      console.warn('[IPsearcher]: None origin ip avaliable, restarting in 5s...');
      setTimeout(() => this.loop(), 5000);
    }
  }

  upload(ips) {
    if (ips instanceof Array) {
      this.origin = [...new Set([...this.origin, ...ips])];
    } else {
      this.origin.unshift(ips);
    }
  }

  setIntervalValue() {
    this.cfg.intervalValue = {};
    Object.keys(this.cfg.interval).map((type) => {
      this.cfg.intervalValue[type] = util.getMilliSecond(this.cfg.interval[type]);
    });
  }

  start() {
    this.setIntervalValue();
    this.loop();
  }

  storeData(body) {
    const data = this.cfg.parser(body);
    if (data && data.ip) {
      database.saveIpDetail(data).then((ip) => {
        console.log(`[IPsearcher]: ${ip} detail stored, next round will start in ${this.cfg.interval.normal}...`);
        setTimeout(() => this.loop(), this.cfg.intervalValue.normal);
      }).catch(console.error);
    } else {
      console.error(`[IPsearcher]: Invalid ip - ${this.cfg.option.qs.ip}`);
      setTimeout(() => this.loop(), this.cfg.intervalValue.error);
    }
  }

}

module.exports = new IpSearcher();
