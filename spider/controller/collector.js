const config = require('../config/resource');
const ConfigHelper = require('./resourceConfiger');
const dispatcher = require('./dispatcher');

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
  }

  getResult(count) {
    return count > 0 ? this.result.splice(0, count) : this.result;
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
    dispatcher.sendRequest(cfg.optionCopy).then((res) => {
      if (cfg.terminator && cfg.terminator(res)) {
        let msg = `[Collector]: All from "${cfg.optionCopy.baseuri || cfg.optionCopy.uri}" done`;
        if (cfg.interval.period) {
          msg += `, starting next round in ${cfg.interval.period}...`;
          setTimeout(() => {
            cfg.resetOption();
            this.loop(cfg);
          }, cfg.intervalValue.period);
        }
        console.log(msg);
      } else {
        cfg.retryCount = 0;
        this.storeData(cfg, res);
        this.getNextRound(cfg);
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

  storeData(cfg, res) {
    const data = cfg.parser(res);
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
          }
        });
        this.resultMap[proxy] = this.result.length - 1;
      }
    });
    console.log(`[Collector]: +${data.length} proxies from "${cfg.getTitle()}", starting next request in ${cfg.interval.normal}...`);
  }

}

module.exports = new Collector();
