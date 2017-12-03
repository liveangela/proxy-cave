const config = require('../config/validation');
const ConfigHelper = require('./validationConfiger');
const dispatcher = require('./dispatcher');
const ipSearcher = require('./ipSearcher');
const database = require('../../database');

class Validator {

  constructor() {
    this.config = {};
    this.parallel = {};
    this.parallelTimespan = 20000;
    this.initConfig();
  }

  changeProxy(cfg) {
    return new Promise((resolve) => {
      const thisParallelSet = this.parallel[cfg.name];
      const target = cfg.option.baseuri || cfg.option.uri;
      const except = thisParallelSet ? thisParallelSet.inuse : [];
      let msg = '';
      database.pickOneProxy(target, except).then((proxyObj) => {
        if (proxyObj && proxyObj.proxy) {
          // TODO: if failed, should change again
          if (thisParallelSet.inuse.indexOf(proxyObj.proxy) >= 0) {
            console.error(`[Validator]: Failed to change parallel, proxy "${proxyObj.proxy}" being already in use due to failure of exception finder`);
          }
          thisParallelSet.inuse[cfg.parallelIndex] = proxyObj.proxy;
          cfg.setProxy(proxyObj);
          msg = `, change proxy to ${proxyObj.proxy}`;
        } else {
          msg = ', none proxy available';
        }
        resolve(msg);
      });
    });
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

  initParallel(cfg) {
    this.parallel[cfg.name] = {
      maxCount: Math.floor(cfg.intervalValue.normal / this.parallelTimespan) - 1,
      inuse: [],
    };
  }

  async loop(cfg) {
    this.manageParallel(cfg);
    if (cfg.proxyArray.length <= 0) {
      const originProxyArray = await database.getOriginProxy(cfg.maxCount);
      if (originProxyArray.length <= 0) {
        console.warn(`[Validator]: None origin proxy avaliable for ${cfg.name}, restarting in 30s...`);
        setTimeout(() => this.loop(cfg), 30000);
        return;
      } else {
        originProxyArray.map((each) => database.updateVerifyTime(each.proxy));
        cfg.proxyArray = originProxyArray;
      }
    }
    cfg.preprocessor();
    dispatcher.sendRequest(cfg.option).then((response) => {
      const { body, timeUsed } = response;
      if (cfg.terminator && cfg.terminator()) {
        let msg = `[Validator]: All from "${cfg.name}" done`;
        if (undefined !== cfg.parallelIndex) msg += ` - parallel[${cfg.parallelIndex}]`;
        if (cfg.interval.period) {
          msg += `, starting next loop in ${cfg.interval.period}...`;
          setTimeout(() => this.loop(cfg), cfg.intervalValue.period);
        }
        console.log(msg);
      } else {
        this.storeData(cfg, body).then((res) => {
          let msg = `[Validator]: add/${res.insertCount}, update/${res.updateCount} verified proxies from "${cfg.name}" in ${timeUsed}ms`;
          if (cfg.option.proxy) msg += ` by proxy ${cfg.option.proxy_origin}`;
          if (undefined !== cfg.parallelIndex) msg += ` - parallel[${cfg.parallelIndex}]`;
          msg += this.getNextRound(cfg);
          console.log(msg);
        });
      }
    }).catch(async (e) => {
      const parallelMsg = undefined !== cfg.parallelIndex ? ` - parallel[${cfg.parallelIndex}]` : '';
      const proxyMsg = cfg.option.proxy ? ` by proxy ${cfg.option.proxy_origin}` : '';
      const changeProxyMsg = await this.changeProxy(cfg);
      console.error(`[Validator]: Failed in "${cfg.name}"${proxyMsg}${parallelMsg} - ${e}${changeProxyMsg}, request will restart in ${cfg.interval.error}...`);
      setTimeout(() => this.loop(cfg), cfg.intervalValue.error);
    });
  }

  async manageParallel(cfg) {
    const thisParallelSet = this.parallel[cfg.name];
    if (thisParallelSet.inuse.length >= thisParallelSet.maxCount) return;
    // open one proxy line at a time, to slower down the parallel lines grow speed
    const proxyObj = await database.pickOneProxy(cfg.option.baseuri || cfg.option.uri, thisParallelSet.inuse);
    if (thisParallelSet.inuse.length >= thisParallelSet.maxCount) return; // pick proxy need a cetain length of time
    if (proxyObj && proxyObj.proxy) {
      if (thisParallelSet.inuse.indexOf(proxyObj.proxy) >= 0) {
        console.error(`[Validator]: Failed to start parallel, proxy "${proxyObj.proxy}" being already in use due to failure of exception finder`);
      } else {
        const newCfg = new ConfigHelper(config[cfg.name]);
        thisParallelSet.inuse.push(proxyObj.proxy);
        newCfg.parallelIndex = thisParallelSet.inuse.length - 1;
        newCfg.setProxy(proxyObj);
        setTimeout(() => this.loop(newCfg), this.parallelTimespan);
        console.log(`[Validator]: Parallel - [${newCfg.parallelIndex}]${proxyObj.proxy} - established for "${cfg.name}"`);
      }
    } else {
      console.warn('[Validator]: Failed to start parallel, none proxy available');
    }
  }

  start() {
    const validations = this.getValidation();
    validations.map((validation) => {
      const cfg = this.config[validation];
      this.initParallel(cfg);
      this.loop(cfg);
    });
  }

  storeData(cfg, body) {
    const data = cfg.parser(body);
    const ipsNeedFirst = [];
    data.map((each, i) => {
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
