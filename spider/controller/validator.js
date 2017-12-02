const config = require('../config/validation');
const ConfigHelper = require('./validationConfiger');
const dispatcher = require('./dispatcher');
const ipSearcher = require('./ipSearcher');
const database = require('../../database');

class Validator {
  constructor() {
    this.config = {};
    this.initConfig();
  }

  getNextRound(cfg) {
    const baseInterval = cfg.intervalValue.normal;
    let interval = baseInterval + Math.floor(Math.random() * 20000);
    let intervalInSecond = Math.floor(interval / 1000);
    let msg = '';
    if (undefined !== cfg.option.requestCount) {
      if (cfg.option.requestCount >= cfg.option.maxReqCount) {
        interval = 500;
      } else {
        const roundStr = 'round-' + (cfg.option.requestCount + 1);
        msg = `, ${roundStr} will start in ${intervalInSecond}s...`;
      }
    } else {
      msg = `, next round will start in ${intervalInSecond}s...`;
    }
    setTimeout(() => this.loop(cfg), interval);
    return msg;
  }

  getValidation() {
    const validation = null;
    return validation || Object.keys(this.config);
  }

  initConfig() {
    Object.keys(config).map((key) => {
      this.config[key] = new ConfigHelper(config[key]);
    });
  }

  async loop(cfg) {
    if (cfg.proxyArray.length <= 0) {
      const originProxyArray = await database.getOriginProxy(cfg.maxCount);
      if (originProxyArray.length <= 0) {
        console.warn(`[Validator]: None origin proxy avaliable for ${cfg.name}, restarting in 30s...`);
        setTimeout(() => this.loop(cfg), 30000);
        return;
      } else {
        cfg.proxyArray = originProxyArray;
      }
    }
    cfg.preprocessor();
    dispatcher.sendRequest(cfg.option).then((response) => {
      const { body, timeUsed } = response;
      if (cfg.terminator && cfg.terminator()) {
        let msg = `[Validator]: All from "${cfg.name}" done`;
        if (cfg.interval.period) {
          msg += `, starting next loop in ${cfg.interval.period}...`;
          setTimeout(() => this.loop(cfg), cfg.intervalValue.period);
        }
        console.log(msg);
      } else {
        this.storeData(cfg, body).then((res) => {
          let msg = `[Validator]: add/${res.insertCount}, update/${res.updateCount} verified proxies from "${cfg.name}" in ${timeUsed}ms`;
          msg += this.getNextRound(cfg);
          console.log(msg);
        });
      }
    }).catch((e) => {
      console.error(`[Validator]: Failed in "${cfg.name}" - ${e}, request will restart in ${cfg.interval.error}...`);
      setTimeout(() => this.loop(cfg), cfg.intervalValue.error);
    });
  }

  start() {
    const validations = this.getValidation();
    validations.map((validation) => {
      this.loop(this.config[validation]);
    });
  }

  storeData(cfg, body) {
    const data = cfg.parser(body);
    const ipsNeedFirst = [];
    data.map((each, i) => {
      database.updateVerifyTime(each.proxy);
      const proxySplits = each.proxy.split(':');
      const ip = proxySplits[0];
      data[i].ip = ip;
      if (each.verify_result) ipsNeedFirst.push(ip);
    });
    ipSearcher.upload(ipsNeedFirst, true);
    return database.storeVerifyResult(data);
  }

}

module.exports = new Validator();
