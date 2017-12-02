const config = require('../config/resource');
const ConfigHelper = require('./resourceConfiger');
const dispatcher = require('./dispatcher');
const ipSearcher = require('./ipSearcher');
const database = require('../../database');

class Collector {

  constructor() {
    this.config = {};
    this.parallel = {};
    this.parallelTimespan = 12000; // the target site needs a break when using parallel
    this.initConfig();
  }

  changeProxy(cfg) {
    return new Promise((resolve) => {
      const thisParallelSet = this.parallel[cfg.name];
      const target = cfg.optionCopy.baseuri || cfg.optionCopy.uri;
      const except = thisParallelSet ? thisParallelSet.inuse : [];
      let msg = '';
      let errorInterval = null;
      let errorIntervalValue = null;
      database.pickOneProxy(target, except).then((proxyObj) => {
        if (proxyObj && proxyObj.proxy) {
          // TODO: if failed, should change again
          if (thisParallelSet && thisParallelSet.inuse.indexOf(proxyObj.proxy) >= 0) {
            console.error(`[Collector]: Failed to change parallel, proxy "${proxyObj.proxy}" being already in use due to failure of exception finder`);
          }
          this.syncParallelSet(cfg, proxyObj);
          msg = `, change proxy to ${proxyObj.proxy}`;
        } else {
          msg = ', no proxy available';
          errorInterval = '5m';
          errorIntervalValue = 300000;
        }
        resolve({
          msg,
          errorInterval,
          errorIntervalValue,
        });
      });
    });
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

  initParallel(cfg) {
    if (cfg.iterator) {
      const maxCount = Math.floor(cfg.intervalValue.normal / this.parallelTimespan) - 1;
      this.parallel[cfg.name] = {
        maxCount,
        inuse: [],
        page: cfg.option.page,
        pageCopy: cfg.option.page,
      };
    }
  }

  loop(cfg, repeat = false) {
    this.manageParallel(cfg, repeat);
    dispatcher.sendRequest(cfg.optionCopy).then((response) => {
      const { body, timeUsed } = response;
      if (cfg.terminator && cfg.terminator(body)) {
        let msg = `[Collector]: All from "${cfg.optionCopy.baseuri || cfg.optionCopy.uri}" done`;
        if (cfg.interval.period) {
          msg += `, next round will start in ${cfg.interval.period}...`;
          this.resetParallel(cfg);
          setTimeout(() => this.loop(cfg), cfg.intervalValue.period);
        }
        console.log(msg);
      } else {
        cfg.retryCount = 0;
        this.storeData(cfg, body).then((res) => {
          const content = res ? `add/${res.insertCount} update/${res.updateCount}, ignore/${res.ignoreCount}` : 'Empty data';
          const thisIntervalChoice = res ? 'normal' : 'error';
          let msg = `[Collector]: ${content} from "${cfg.getTitle()}" in ${timeUsed}ms`;
          if (cfg.optionCopy.proxy) msg += ` by proxy ${cfg.optionCopy.proxy_origin}`;
          if (cfg.iterator && undefined === this.parallel[cfg.name]) cfg.iterator();
          msg += `, next collection will start in ${cfg.interval[thisIntervalChoice]}...`;
          setTimeout(() => this.loop(cfg), cfg.intervalValue[thisIntervalChoice]);
          console.log(msg);
        });
      }
    }).catch((e) => this.loopErrorHandler(e, cfg));
  }

  async loopErrorHandler(e, cfg) {
    const proxyMsg = cfg.optionCopy.proxy ? ` by proxy ${cfg.optionCopy.proxy_origin}` : '';
    let msg = `[Collector]: Failed in "${cfg.getTitle()}"${proxyMsg} - ${e}`;
    let errorInterval = cfg.interval.error;
    let errorIntervalValue = cfg.intervalValue.error;
    if (cfg.retryCount >= cfg.retryCountMax) {
      msg += ', meet max fail counts';
      const msgObj = await this.changeProxy(cfg);
      msg += msgObj.msg;
      if (msgObj.errorInterval) errorInterval = msgObj.errorInterval;
      if (msgObj.errorIntervalValue) errorIntervalValue = msgObj.errorIntervalValue;
    } else {
      cfg.retryCount += 1;
    }
    msg += `, request will restart in ${errorInterval}...`;
    console.error(msg);
    setTimeout(() => this.loop(cfg, true), errorIntervalValue);
  }

  async manageParallel(cfg, repeat) {
    const thisParallelSet = this.parallel[cfg.name];
    if (thisParallelSet) {
      if (!repeat) cfg.iterator(thisParallelSet.pageCopy++);
      if (thisParallelSet.inuse.length >= thisParallelSet.maxCount) return;
      // open one proxy line at a time, to slower down the parallel lines grow speed
      const proxyObj = await database.pickOneProxy(cfg.optionCopy.baseuri, thisParallelSet.inuse);
      if (proxyObj && proxyObj.proxy) {
        if (thisParallelSet.inuse.indexOf(proxyObj.proxy) >= 0) {
          console.error(`[Collector]: Failed to start parallel, proxy "${proxyObj.proxy}" being already in use due to failure of exception finder`);
        } else {
          const newCfg = new ConfigHelper(config[cfg.name]);
          thisParallelSet.inuse.push(proxyObj.proxy);
          newCfg.parallelIndex = thisParallelSet.inuse.length - 1;
          newCfg.iterator(thisParallelSet.pageCopy);
          newCfg.setProxy(proxyObj);
          setTimeout(() => this.loop(newCfg), this.parallelTimespan);
          console.log(`[Collector]: Parallel - [${newCfg.parallelIndex}]${proxyObj.proxy} - established for "${cfg.name}"`);
        }
      } else {
        console.warn('[Collector]: Failed to start parallel, no proxy available');
      }
    }
  }

  refine(proxy) {
    const newProxy = proxy.replace(/：/, ':');
    const regExp = /\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}:\d{1,4}/;
    return regExp.test(newProxy) ? newProxy : false;
  }

  resetParallel(cfg) {
    if (undefined !== cfg.parallelIndex) {
      const thisParallelSet = this.parallel[cfg.name];
      thisParallelSet.pageCopy = thisParallelSet.page;
    } else {
      cfg.resetOption();
    }
  }

  syncParallelSet(cfg, proxyObj) {
    if (undefined !== cfg.parallelIndex) {
      const thisParallelSet = this.parallel[cfg.name];
      thisParallelSet.inuse.splice(cfg.parallelIndex, 1);
      thisParallelSet.inuse.push(proxyObj.proxy);
      cfg.parallelIndex = thisParallelSet.inuse.length - 1;
    }
    cfg.setProxy(proxyObj);
  }

  start() {
    const targets = this.getTarget();
    targets.map((target) => {
      const cfg = this.config[target];
      this.initParallel(cfg);
      this.loop(cfg);
    });
  }

  storeData(cfg, body) {
    return new Promise((resolve) => {
      const data = cfg.parser(body);
      const docs = [];
      const ips = [];
      const ts = Date.now();
      if (data.length > 0) {
        data.map((proxy) => {
          const originProxy = proxy;
          proxy = this.refine(proxy);
          if (proxy) {
            const proxySplits = proxy.split(':');
            const set = {
              proxy,
              host: proxySplits[0],
              port: proxySplits[1],
              create_time: {
                [cfg.name]: ts,
              },
              from: cfg.name,
            };
            ips.push(set.host);
            docs.push(set);
          } else {
            console.warn(`[Collector]: Unknown proxy "${originProxy}" from ${cfg.name}`);
          }
        });
        ipSearcher.upload(ips);
        database.storeProxyOrigin(docs).then(resolve);
      } else {
        resolve(null);
      }
    });
  }

}

module.exports = new Collector();
