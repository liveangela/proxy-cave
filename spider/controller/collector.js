const config = require('../config/resource');
const ConfigHelper = require('./resourceConfiger');
const dispatcher = require('./dispatcher');
const ipSearcher = require('./ipSearcher');
const { proxyOriginORM } = require('../../database');

class Collector {
  constructor() {
    this.result = [];
    this.resultMap = {};
    this.config = {};
    this.initConfig();
  }

  getNextRound(cfg) {
    cfg.iterator && cfg.iterator();
    setTimeout(() => this.loop(cfg), cfg.intervalValue.normal);
    return `, next collection will start in ${cfg.interval.normal}...`;
  }

  getResult(count) {
    let res = [];
    if (count > 0) {
      const ts = Date.now();
      const timespanLimit = 5 * 50 * 1000;
      for (let i = 0, j = 0; i < this.result.length; i++) {
        const thisResult = this.result[i];
        const thisTS = thisResult.lastverify_time;
        if ((ts - thisTS) > timespanLimit) {
          thisResult.lastverify_time = ts;
          res.push(thisResult);
          j++;
        }
        if (j >= count) break;
      }
    } else {
      res = this.result;
    }
    return res;
  }

  getResultMap() {
    return this.resultMap;
  }

  getTarget() {
    const targets = null;
    return targets || Object.keys(this.config);
  }

  initConfig() {
    Object.keys(config).map((key) => {
      this.config[key] = new ConfigHelper(config[key]);
    });
  }

  loop(cfg) {
    dispatcher.sendRequest(cfg.optionCopy).then((body) => {
      if (cfg.terminator && cfg.terminator(body)) {
        let msg = `[Collector]: All from "${cfg.optionCopy.baseuri || cfg.optionCopy.uri}" done`;
        if (cfg.interval.period) {
          msg += `, next round will start in ${cfg.interval.period}...`;
          setTimeout(() => {
            cfg.resetOption();
            this.loop(cfg);
          }, cfg.intervalValue.period);
        }
        console.log(msg);
      } else {
        cfg.retryCount = 0;
        this.storeData(cfg, body).then((res) => {
          let msg = `[Collector]: add/${res.insertCount}, addFail/${res.insertFailCount}, update/${res.updateCount}, ignore/${res.ignoreCount} from "${cfg.getTitle()}"`;
          msg += this.getNextRound(cfg);
          console.log(msg);
        });
      }
    }).catch((e) => {
      let msg = `[Collector]: Failed in "${cfg.getTitle()}" - ${e}`;
      if (cfg.retryCount >= cfg.retryCountMax) {
        msg += ', meet max fail counts, abort~';
        if (cfg.iterator) {
          cfg.iterator();
          setTimeout(() => this.loop(cfg), cfg.intervalValue.error);
        }
      } else {
        cfg.retryCount += 1;
        msg += `, request will restart in ${cfg.interval.error}...`;
        setTimeout(() => this.loop(cfg), cfg.intervalValue.error);
      }
      console.error(msg);
    });
  }

  refine(proxy) {
    const newProxy = proxy.replace(/：/, ':');
    const regExp = /\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}:\d{1,4}/;
    return regExp.test(newProxy) ? newProxy : false;
  }

  start() {
    const targets = this.getTarget();
    targets.map((target) => {
      this.loop(this.config[target]);
    });
  }

  storeData(cfg, body) {
    const data = cfg.parser(body);
    const docs = [];
    data.map((proxy) => {
      const originProxy = proxy;
      proxy = this.refine(proxy);
      if (proxy) {
        ipSearcher.upload(proxy);
        docs.push(proxy);
      } else {
        console.warn(`[Collector]: Unknown proxy "${originProxy}" from ${cfg.name}`);
      }
    });
    return proxyOriginORM.save(cfg.name, docs);
  }

}

module.exports = new Collector();
