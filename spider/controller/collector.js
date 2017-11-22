const config = require('../config/resource');
const ConfigHelper = require('./resourceConfiger');
const dispatcher = require('./dispatcher');
const ipSearcher = require('./ipSearcher');

class Collector {
  constructor() {
    this.result = [];
    this.resultMap = {};
    this.config = {};
    this.initConfig();
  }

  getNextRound(cfg) {
    cfg.iterator && cfg.iterator();
    const baseInterval = cfg.intervalValue.normal;
    const interval = baseInterval + Math.floor(Math.random() * 20000);
    setTimeout(() => this.loop(cfg), interval);
    return `, next collection will start in ${(interval / 1000 / 60).toFixed(2)}m...`;
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
        let msg = '';
        msg += this.storeData(cfg, body);
        msg += this.getNextRound(cfg);
        console.log(msg);
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

  start() {
    const targets = this.getTarget();
    targets.map((target) => {
      this.loop(this.config[target]);
    });
  }

  storeData(cfg, body) {
    const data = cfg.parser(body);
    const ts = Date.now();
    data.map((proxy) => {
      const index = this.resultMap[proxy];
      if (undefined !== index) {
        const createTimeSet = this.result[index].create_time;
        if (undefined === createTimeSet[cfg.name]) createTimeSet[cfg.name] = ts;
      } else {
        const proxySplits = proxy.split(':');
        this.result.push({
          proxy,
          id: this.result.length + 1,
          host: proxySplits[0],
          port: proxySplits[1],
          create_time: {
            [cfg.name]: ts,
          },
          lastverify_time: 0,
        });
        this.resultMap[proxy] = this.result.length - 1;
        ipSearcher.upload(proxySplits[0]);
      }
    });
    return `[Collector]: +${data.length} origin proxies from "${cfg.getTitle()}"`;
  }

}

module.exports = new Collector();
