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
        this.storeData(cfg, res);
        this.getNextRound(cfg);
      }
    }).catch((e) => {
      // console.error(`[Collect]: Failed in "${cfg.optionCopy.uri}" - ${e}, request will restart in ${cfg.interval.error}...`);
      // console.log(e);
      // setTimeout(() => this.loop(cfg), cfg.intervalValue.error);
      console.error(cfg.errorHandler(e, this.loop));
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
    const title = cfg.name + (cfg.iterator ? '/' + cfg.optionCopy.page : '');
    const set = data.map((proxy) => {
      return {
        proxy,
        download_time: ts,
        from: cfg.name,
      };
    });
    this.result = [...this.result, ...set];
    console.log(`[Collect]: +${data.length} proxies from "${title}", starting next request in ${cfg.interval.normal}...`);
  }

}

module.exports = new Collect();