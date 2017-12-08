const dispatcher = require('./dispatcher');
const database = require('../../database');
const configs = {
  Collector: require('../config/resource'),
  Validator: require('../config/validation'),
  Ipsearcher: require('../config/ipdetail'),
};

class Baser {

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
      database.pickOneProxy(cfg.targetURI, except).then((proxyObj) => {
        if (proxyObj && proxyObj.proxy) {
          if (thisParallelSet && thisParallelSet.inuse.indexOf(proxyObj.proxy) >= 0) {
            msg = `, proxy "${proxyObj.proxy}" being already in use due to failure of exception finder`;
          } else {
            this.syncParallelSet(cfg, proxyObj);
            msg = `, change proxy to ${proxyObj.proxy}`;
          }
        } else {
          msg = ', none proxy available';
        }
        resolve(msg);
      });
    });
  }

  emitMsg(msg) {
    this.io && this.io.emit('msg', msg);
  }

  getOriginProxy(count, isForIpdetail = false) {
    return database.getOriginProxy(count, isForIpdetail);
  }

  initParams(type) {
    this.type = type;
    this.config = configs[type];
    this.parallel = {};
    switch (this.type) {
      case 'Collector':
        this.storeDataMethodName = 'storeProxyOrigin';
        this.parallelTimespan = 10000; // the target site needs a break when using parallel
        this.dbsaveMsgHandler = (res) => `[Collector]: add/${res.insertCount}, update/${res.updateCount}, ignore/${res.ignoreCount}`;
        break;
      case 'Validator':
        this.storeDataMethodName = 'storeVerifyResult';
        this.parallelTimespan = 20000;
        this.dbsaveMsgHandler = (res) => `[Validator]: add/${res.insertCount}, update/${res.updateCount} verified proxies`;
        break;
      case 'Ipsearcher':
        this.storeDataMethodName = 'storeIpDetail';
        this.parallelTimespan = 1000;
        this.dbsaveMsgHandler = (res) => `[Ipsearcher]: add/${res.insertCount}, ignore/${res.ignoreCount} detail`;
        break;
    }
  }

  injectSocket(io) {
    this.io = io;
  }

  injectLogger(logger) {
    this.logger = logger;
  }

  async loop(cfg, repeat = false) {
    await this.preprocess(cfg, repeat);
    this.manageParallel(cfg, repeat);
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
    this.msgSender({
      msg: `[${this.type}]: Failed in "${cfg.getTitle()}"${proxyMsg}${parallelMsg} - ${e}${changeProxyMsg}, request will restart in ${cfg.interval.error}...`,
    });
    setTimeout(() => this.loop(cfg, true), cfg.intervalValue.error);
  }

  async manageParallel(cfg) {
    const thisParallelSet = this.parallel[cfg.name];
    if (thisParallelSet) {
      if (thisParallelSet.inuse.length >= thisParallelSet.maxCount) return;
      // open one proxy line at a time, to slower down the parallel lines grow speed
      const proxyObj = await database.pickOneProxy(cfg.targetURI, thisParallelSet.inuse);
      if (thisParallelSet.inuse.length >= thisParallelSet.maxCount) return; // pick proxy need a cetain length of time
      let msg = '';
      if (proxyObj && proxyObj.proxy) {
        if (thisParallelSet.inuse.indexOf(proxyObj.proxy) >= 0) {
          msg = `[${this.type}]: Failed to start parallel, proxy "${proxyObj.proxy}" being already in use due to failure of exception finder`;
        } else {
          const Configer = this.config[cfg.name];
          const newCfg = new Configer(cfg.name);
          thisParallelSet.inuse.push(proxyObj.proxy);
          newCfg.parallelIndex = thisParallelSet.inuse.length - 1;
          newCfg.setProxy(proxyObj);
          if (newCfg.iterator) newCfg.iterator(thisParallelSet.page);
          setTimeout(() => this.loop(newCfg), this.parallelTimespan);
          msg = `[${this.type}]: Parallel - [${newCfg.parallelIndex}]${proxyObj.proxy} - established for "${cfg.name}"`;
        }
      } else {
        msg = `[${this.type}]: Failed to start parallel, none proxy available`;
      }
      this.msgSender({ msg });
    }
  }

  postprocess(cfg, response) {
    const { body, timeUsed } = response;
    const parallelMsg = undefined !== cfg.parallelIndex ? ` - parallel[${cfg.parallelIndex}]` : '';
    const proxyMsg = cfg.option.proxy_origin ? ` by proxy ${cfg.option.proxy_origin}` : '';
    if (cfg.terminator && cfg.terminator(body)) {
      let msg = `[${this.type}]: All from "${cfg.name}" done${parallelMsg}`;
      if (cfg.interval.period) {
        msg += `, starting next loop in ${cfg.interval.period}...`;
        if ('Collector' === this.type) this.resetParallel(cfg);
        setTimeout(() => this.loop(cfg), cfg.intervalValue.period);
      }
      this.msgSender({ msg });
    } else {
      const data = cfg.parser(body);
      if (data.length <= 0) {
        this.loopErrorHandler(new Error('Empty data'), cfg);
      } else {
        const docs = this.dealData(data, cfg);
        database[this.storeDataMethodName](docs).then((res) => {
          let msg = this.dbsaveMsgHandler(res);
          msg += ` from "${cfg.getTitle()}" in ${timeUsed}ms${proxyMsg}${parallelMsg}`;
          msg += this.getNextRound(cfg);
          this.msgSender({ msg });
        });
      }
    }
  }

  msgSender({
    msg = '',
    level = 'info',
    needEmit = true,
  }) {
    if (msg) {
      this.logger[level](msg);
      if (needEmit) this.emitMsg(msg);
    }
  }

  start() {
    const chosenConfigs = null;
    (chosenConfigs || Object.keys(this.config)).map((key) => {
      const Configer = this.config[key];
      const cfg = new Configer(key);
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

  uploadIPs(ips, needFirst) {
    this.upload && this.upload(ips, needFirst);
  }

}

module.exports = Baser;
