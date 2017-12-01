const util = require('../util');

module.exports = class ResourceConfiger {

  constructor(cfg) {
    this.init(cfg);
    this.setHeaders();
    this.resetOption();
    this.setIntervalValue();
  }

  init(cfg) {
    this.name = cfg.name;
    this.option = cfg.option;
    this.interval = cfg.interval;
    this.parser = cfg.parser;
    this.iterator = cfg.iterator;
    this.terminator = cfg.terminator;
    this.retryCount = 0;
    this.retryCountMax = 1;
  }

  getTitle() {
    return this.name + (this.iterator ? '/' + this.optionCopy.page : '');
  }

  resetOption() {
    this.optionCopy = JSON.parse(JSON.stringify(this.option));
    this.retryCount = 0;
  }

  setHeaders() {
    this.option.headers = {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'zh-CN,zh;q=0.8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
    };
  }

  setIntervalValue() {
    this.intervalValue = {};
    Object.keys(this.interval).map((type) => {
      this.intervalValue[type] = util.getMilliSecond(this.interval[type]);
    });
  }

  setProxy(proxyObj) {
    // only set proxy in copy option, so that proxy will be invalid after call resetOption()
    this.optionCopy.proxy = 'http://' + proxyObj.proxy;
    this.optionCopy.proxy_origin = proxyObj.proxy;
    this.optionCopy.proxy_verify_result_list = proxyObj.result_list;
    this.retryCount = 0;
  }

};
