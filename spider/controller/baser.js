const dispatcher = require('./dispatcher');
const ipSearcher = require('./ipSearcher');
const database = require('../../database');
const configs = {
  Collector: require('../config/resource'),
  Validator: require('../config/validation'),
};

class Base {

  constructor(type) {
    if (['Collector', 'Validator', 'Ipsearcher'].includes(type)) {
      this.initParams(type);
    } else {
      throw new Error(`[SpiderBaseController]: Failed to init controller for unknown type "${type}"`);
    }
  }

  changeProxy(cfg) {
    return new Promise((resolve) => {
      const thisParallelSet = this.parallel[cfg.name];
      const except = thisParallelSet ? thisParallelSet.inuse : [];
      let msg = '';
      database.pickOneProxy(this.targetURI, except).then((proxyObj) => {
        if (proxyObj && proxyObj.proxy) {
          if (thisParallelSet && thisParallelSet.inuse.indexOf(proxyObj.proxy) >= 0) {
            console.error(`[${this.type}]: Failed to change parallel, proxy "${proxyObj.proxy}" being already in use due to failure of exception finder`);
          }
          this.syncParallelSet(cfg, proxyObj);
          msg = `, change proxy to ${proxyObj.proxy}`;
        } else {
          msg = ', none proxy available';
        }
        resolve(msg);
      });
    });
  }

  initParams(type) {
    this.type = type;
    this.config = configs[type];
    this.parallel = {};
    switch (this.type) {
      case 'Collector':
        this.storeDataMethodName = 'storeProxyOrigin';
        this.parallelTimespan = 10000; // the target site needs a break when using parallel
        this.msgHandler = (res) => `[Collector]: add/${res.insertCount} update/${res.updateCount}, ignore/${res.ignoreCount}`;
        break;
      case 'Validator':
        this.storeDataMethodName = 'storeVerifyResult';
        this.parallelTimespan = 20000;
        this.msgHandler = (res) => `[Validator]: add/${res.insertCount}, update/${res.updateCount} verified proxies`;
        break;
      case 'Ipsearcher':
        this.parallelTimespan = 1000;
        break;
    }
  }

  async loop(cfg, repeat = false) {
    this.manageParallel(cfg, repeat);
    if ('Validator' === this.type) await this.preprocess(cfg);
    dispatcher.sendRequest(cfg.option).then((response) => {
      this.postprocess(cfg, response);
    }).catch((e) => {
      this.loopErrorHandler(e, cfg);
    });
  }

  async loopErrorHandler(e, cfg) {
    const parallelMsg = undefined !== cfg.parallelIndex ? ` - parallel[${cfg.parallelIndex}]` : '';
    const proxyMsg = cfg.option.proxy_origin ? ` by proxy ${cfg.option.proxy_origin}` : '';
    const changeProxyMsg = await this.changeProxy(cfg);
    console.error(`[${this.type}]: Failed in "${cfg.getTitle()}"${proxyMsg}${parallelMsg} - ${e}${changeProxyMsg}, request will restart in ${cfg.interval.error}...`);
    setTimeout(() => this.loop(cfg, true), cfg.intervalValue.error);
  }

  async manageParallel(cfg, repeat) {
    const thisParallelSet = this.parallel[cfg.name];
    if (thisParallelSet) {
      if (cfg.iterator && !repeat) cfg.iterator(thisParallelSet.page++);
      if (thisParallelSet.inuse.length >= thisParallelSet.maxCount) return;
      // open one proxy line at a time, to slower down the parallel lines grow speed
      const proxyObj = await database.pickOneProxy(this.targetURI, thisParallelSet.inuse);
      if (thisParallelSet.inuse.length >= thisParallelSet.maxCount) return; // pick proxy need a cetain length of time
      if (proxyObj && proxyObj.proxy) {
        if (thisParallelSet.inuse.indexOf(proxyObj.proxy) >= 0) {
          console.error(`[${this.type}]: Failed to start parallel, proxy "${proxyObj.proxy}" being already in use due to failure of exception finder`);
        } else {
          const Configer = this.config[cfg.name];
          const newCfg = new Configer(cfg.name);
          thisParallelSet.inuse.push(proxyObj.proxy);
          newCfg.parallelIndex = thisParallelSet.inuse.length - 1;
          newCfg.setProxy(proxyObj);
          if (newCfg.iterator) newCfg.iterator(thisParallelSet.page);
          setTimeout(() => this.loop(newCfg), this.parallelTimespan);
          console.log(`[${this.type}]: Parallel - [${newCfg.parallelIndex}]${proxyObj.proxy} - established for "${cfg.name}"`);
        }
      } else {
        console.warn(`[${this.type}]: Failed to start parallel, none proxy available`);
      }
    }
  }

  postprocess(cfg, response) {
    const { body, timeUsed } = response;
    if (cfg.terminator && cfg.terminator(body)) {
      let msg = `[${this.type}]: All from "${cfg.name}" done`;
      if (undefined !== cfg.parallelIndex) msg += ` - parallel[${cfg.parallelIndex}]`;
      if (cfg.interval.period) {
        msg += `, starting next loop in ${cfg.interval.period}...`;
        if ('Collector' === this.type) this.resetParallel(cfg);
        setTimeout(() => this.loop(cfg), cfg.intervalValue.period);
      }
      console.log(msg);
    } else {
      const data = cfg.parser(body);
      if (data.length <= 0) {
        this.loopErrorHandler(new Error('Empty data'), cfg);
      } else {
        const { docs, ips } = this.dealData(data, cfg);
        ipSearcher.upload(ips, 'Validator' === this.type);
        database[this.storeDataMethodName](docs).then((res) => {
          let msg = this.msgHandler(res);
          msg += ` from "${cfg.getTitle()}" in ${timeUsed}ms`;
          if (cfg.option.proxy) msg += ` by proxy ${cfg.option.proxy_origin}`;
          if (cfg.iterator && undefined === this.parallel[cfg.name]) cfg.iterator();
          msg += this.getNextRound(cfg);
          console.log(msg);
        });
      }
    }
  }

  preprocess(cfg) {
    return new Promise(async (resolve, reject) => {
      if (cfg.proxyArray.length <= 0) {
        const originProxyArray = await database.getOriginProxy(cfg.maxCount);
        if (originProxyArray.length <= 0) {
          console.warn(`[${this.type}]: None origin proxy avaliable for ${cfg.name}, restarting in 10s...`);
          setTimeout(() => this.loop(cfg), 10000);
          reject();
          return;
        } else {
          originProxyArray.map((each) => database.updateVerifyTime(each.proxy));
          cfg.proxyArray = originProxyArray;
        }
      }
      cfg.preprocessor();
      resolve();
    });
  }

  start() {
    const chosenConfigs = null;
    (chosenConfigs || Object.keys(this.config)).map((key) => {
      const Configer = this.config[key];
      const cfg = new Configer(key);
      this.targetURI = cfg.option.baseuri || cfg.option.uri;
      this.initParallel(cfg);
      this.loop(cfg);
    });
  }

  syncParallelSet(cfg, proxyObj) {
    if (undefined !== cfg.parallelIndex) {
      this.parallel[cfg.name].inuse[cfg.parallelIndex] = proxyObj.proxy;
    }
    cfg.setProxy(proxyObj);
  }

}

module.exports = Base;
