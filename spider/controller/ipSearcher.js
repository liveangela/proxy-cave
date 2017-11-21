const config = require('../config/ipdetail');
const dispatcher = require('./dispatcher');
const util = require('../util');

class IpSearcher {

  constructor() {
    this.cfg = config;
    this.origin = [];
    this.result = [];
    this.resultMap = {};
  }

  getResult() {
    return this.result;
  }

  loop() {
    if (this.origin.length > 0) {
      const ip = this.origin.shift();
      this.cfg.option.qs.ip = ip;
      dispatcher.sendRequest(this.cfg.option).then((body) => {
        const data = this.cfg.parser(body);
        if (data) {
          this.storeData(data);
          console.log(`[IPsearcher]: ${data.ip} detail stored, next round will start in ${this.cfg.interval.normal}...`);
          setTimeout(() => this.loop(), this.cfg.intervalValue.normal);
        } else {
          console.error(`[IPsearcher]: Invalid ip - ${ip}`);
          this.upload(ip);
          setTimeout(() => this.loop(), this.cfg.intervalValue.normal);
        }
      }).catch();
    } else {
      console.warn('[IPsearcher]: None origin ip avaliable, restarting in 5s...');
      setTimeout(() => this.loop(), 5000);
    }
  }

  upload(ip) {
    if (!this.resultMap[ip]) {
      this.origin.push(ip);
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

  storeData(data) {
    this.result.push(data);
    this.resultMap[data.ip] = true;
  }

}

module.exports = new IpSearcher();
