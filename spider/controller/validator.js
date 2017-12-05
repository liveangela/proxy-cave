const Baser = require('./baser');

class Validator extends Baser {

  constructor() {
    super('Validator');
  }

  dealData(data) {
    const ips = [];
    data.map((each) => {
      const proxySplits = each.proxy.split(':');
      const ip = proxySplits[0];
      if (each.verify_result) ips.push(ip);
    });
    return {
      ips,
      docs: data,
    };
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

  initParallel(cfg) {
    this.parallel[cfg.name] = {
      maxCount: Math.floor(cfg.intervalValue.normal / this.parallelTimespan) - 1,
      inuse: [],
    };
  }

  async preprocess(cfg) {
    if (cfg.proxyArray.length <= 0) {
      const originProxyArray = await this.getOriginProxy(cfg.maxCount);
      if (originProxyArray.length <= 0) {
        setTimeout(() => this.loop(cfg), 10000);
        throw new Error(`[${this.type}]: None origin proxy avaliable for ${cfg.name}, restarting in 10s...`);
      } else {
        cfg.proxyArray = originProxyArray;
      }
    }
    cfg.preprocessor();
  }

}

module.exports = new Validator();
