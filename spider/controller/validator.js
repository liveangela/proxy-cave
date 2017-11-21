const config = require('../config/validation');
const ConfigHelper = require('./validationConfiger');
const dispatcher = require('./dispatcher');
const collector = require('./collector');

class Validator {
  constructor() {
    this.result = [];
    this.resultMap = {};
    this.config = {};
    this.initConfig();
  }

  getNextRound(cfg) {
    const baseInterval = cfg.intervalValue.normal;
    const interval = baseInterval + Math.floor(Math.random() * 20000);
    const roundStr = undefined === cfg.option.requestCount ? 'next round' : 'round-' + (cfg.option.requestCount + 1);
    setTimeout(() => this.loop(cfg), interval);
    return `, ${roundStr} will start in ${Math.floor(interval / 1000)}s...`;
  }

  getOriginProxy(maxCount) {
    return collector.getResult(maxCount);
  }

  getResult() {
    return this.result;
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

  loop(cfg) {
    if (cfg.proxyArray.length <= 0) {
      const originProxyArray = this.getOriginProxy(cfg.maxCount);
      if (originProxyArray.length <= 0) {
        setTimeout(() => {
          console.warn('[Validator]: None origin proxy avaliable, restarting in 30s...');
          this.loop(cfg);
        }, 30000);
        return;
      } else {
        cfg.proxyArray = originProxyArray;
      }
    }
    cfg.preprocessor();
    dispatcher.sendRequest(cfg.option).then((body) => {
      if (cfg.terminator && cfg.terminator()) {
        let msg = `[Validator]: All from "${cfg.name}" done`;
        if (cfg.interval.period) {
          msg += `, starting next round in ${cfg.interval.period}...`;
          setTimeout(() => {
            this.loop(cfg);
          }, cfg.intervalValue.period);
        }
        console.log(msg);
      } else {
        let msg = '';
        msg += this.storeData(cfg, body);
        msg += this.getNextRound(cfg);
        console.log(msg);
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
    data.map((proxySet) => {
      const index = this.resultMap[proxySet.proxy];
      if (undefined !== index) {
        this.result[index].result.push(proxySet);
      } else {
        const collectorResultMap = collector.getResultMap();
        this.result.push({
          id: collectorResultMap[proxySet.proxy] + 1,
          result: [proxySet],
        });
        this.resultMap[proxySet.proxy] = this.result.length - 1;
      }
    });
    return `[Validator]: +${data.length} verified proxies from ${cfg.name}`;
  }

}

module.exports = new Validator();
