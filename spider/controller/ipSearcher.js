const Baser = require('./baser');

class Ipsearcher extends Baser {

  constructor() {
    super('Ipsearcher');
    this.origin = [];
  }

  dealData(data) {
    return data;
  }

  getNextRound(cfg) {
    let msg = `, next round will start in ${cfg.interval.normal}...`;
    setTimeout(() => this.loop(cfg), cfg.intervalValue.normal);
    return msg;
  }

  initParallel(cfg) {
    this.parallel[cfg.name] = {
      maxCount: Math.floor(cfg.intervalValue.normal / this.parallelTimespan) - 1,
      inuse: [],
    };
  }

  preprocess(cfg) {
    return new Promise(async (resolve, reject) => {
      if (this.origin.length <= 0) {
        const originProxies = await this.getOriginProxy(Infinity, true);
        if (originProxies.length > 0) {
          const ips = originProxies.map((doc) => doc.host);
          this.upload(ips);
        } else {
          setTimeout(() => this.loop(cfg), 10000);
          const err = new Error('[Ipsearcher]: None origin ip avaliable, restarting in 10s...');
          this.msgSender({
            msg: err.message,
            level: 'warn',
          });
          reject(err);
          return;
        }
      }
      const ip = this.origin.shift();
      cfg.preprocessor(ip);
      resolve();
    });
  }

  upload(ips, needFirst = false) {
    if (ips instanceof Array) {
      const arr = needFirst ? [...ips, ...this.origin] : [...this.origin, ...ips];
      this.origin = [...new Set(arr)];
    } else {
      throw new Error('[Ipsearcher]: Upload type error, need array');
    }
  }

}

module.exports = new Ipsearcher();
