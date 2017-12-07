const Baser = require('./baser');

class Collector extends Baser {

  constructor() {
    super('Collector');
  }

  dealData(data, cfg) {
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
        this.msgSender({
          msg: `[Collector]: Unknown proxy "${originProxy}" from ${cfg.name}`,
          level: 'warn',
        });
      }
    });
    this.uploadIPs(ips);
    return docs;
  }

  getNextRound(cfg) {
    let msg = `, next round will start in ${cfg.interval.normal}...`;
    setTimeout(() => this.loop(cfg), cfg.intervalValue.normal);
    return msg;
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

  preprocess(cfg, repeat) {
    if (!cfg.iterator) return;
    const thisParallelSet = this.parallel[cfg.name];
    if (undefined === thisParallelSet) {
      cfg.iterator();
    } else if (!repeat) {
      cfg.iterator(thisParallelSet.page++);
    }
  }

  refine(proxy) {
    const newProxy = proxy.replace(/：/, ':');
    const regExp = /^\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}:\d{1,5}$/;
    return regExp.test(newProxy) ? newProxy : false;
  }

  resetParallel(cfg) {
    if (undefined !== cfg.parallelIndex) {
      const thisParallelSet = this.parallel[cfg.name];
      thisParallelSet.page = thisParallelSet.pageCopy;
    } else {
      cfg.resetOption();
    }
  }

}

module.exports = new Collector();
