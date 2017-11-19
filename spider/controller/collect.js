const config = require('../config/resource');
const ConfigHelper = require('./collectConfiger');
const dispatch = require('./dispatch').sendRequest;

class Collect {
  constructor() {
    this.result = [];
    this.config = {};
    this.initConfig();
  }

  getNextRound(cfg) {
    cfg.iterator && cfg.iterator();
    setTimeout(() => this.loop(cfg), cfg.intervalValue.normal);
  }

  getResult() {
    return this.result;
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
    dispatch(cfg.optionCopy).then((res) => {
      if (cfg.terminator && cfg.terminator(res)) {
        let msg = `[Collect]: All from "${cfg.optionCopy.baseuri || cfg.optionCopy.uri}" done`;
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
      let msg = `[Collect]: Failed in "${cfg.getTitle()}" - ${e}`;
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
    const set = data.map((proxy) => {
      return {
        proxy,
        download_time: ts,
        from: cfg.name,
      };
    });
    this.result = [...this.result, ...set];
    console.log(`[Collect]: +${data.length} proxies from "${cfg.getTitle()}", starting next request in ${cfg.interval.normal}...`);
  }

}

module.exports = new Collect();