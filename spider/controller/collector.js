const config = require('../config/resource');
const ConfigHelper = require('./resourceConfiger');
const dispatcher = require('./dispatcher');
const ipSearcher = require('./ipSearcher');
const database = require('../../database');

class Collector {
  constructor() {
    this.config = {};
    this.initConfig();
  }

  getNextRound(cfg) {
    cfg.iterator && cfg.iterator();
    setTimeout(() => this.loop(cfg), cfg.intervalValue.normal);
    return `, next collection will start in ${cfg.interval.normal}...`;
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
    const timeStart = Date.now();
    dispatcher.sendRequest(cfg.optionCopy).then((body) => {
      const timeUsed = Date.now() - timeStart;
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
          let msg = `[Collector]: add/${res.insertCount} update/${res.updateCount}, ignore/${res.ignoreCount} from "${cfg.getTitle()} in ${timeUsed}ms"`;
          if (cfg.optionCopy.proxy) msg += ` by proxy "${cfg.optionCopy.proxy}"`;
          msg += this.getNextRound(cfg);
          console.log(msg);
        });
      }
    }).catch(async (e) => {
      let msg = `[Collector]: Failed in "${cfg.getTitle()}" - ${e}`;
      let errorInterval = cfg.interval.error;
      let errorIntervalValue = cfg.intervalValue.error;
      if (cfg.retryCount >= cfg.retryCountMax) {
        msg += ', meet max fail counts';
        const target = cfg.optionCopy.baseuri || cfg.optionCopy.uri;
        const proxyObj = await database.pickOneProxy(target);
        if (proxyObj && proxyObj.proxy) {
          cfg.setProxy(proxyObj);
          msg += `, change proxy to ${proxyObj.proxy}`;
        } else {
          msg += ', no proxy can be used';
          errorInterval = '5m';
          errorIntervalValue = 300000;
        }
      } else {
        cfg.retryCount += 1;
      }
      msg += `, request will restart in ${errorInterval}...`;
      console.error(msg);
      setTimeout(() => this.loop(cfg), errorIntervalValue);
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
    const ips = [];
    const ts = Date.now();
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
    return database.storeProxyOrigin(docs);
  }

}

module.exports = new Collector();
