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
        this.storeData(cfg, body).then((res) => {
          let msg = `[Collector]: add/${res.insertCount} update/${res.updateCount + res.insertToUpdateCount}, ignore/${res.ignoreCount} from "${cfg.getTitle()}"`;
          msg += this.getNextRound(cfg);
          console.log(msg);
        }).catch(console.error);
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
    return database.saveProxyOrigin(docs);
  }

}

module.exports = new Collector();
