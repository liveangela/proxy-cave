const util = require('../util');

module.exports = class ValidationConfiger {

  constructor(cfg) {
    this.init(cfg);
    this.setHeaders();
    this.setIntervalValue();
  }

  init(cfg) {
    this.name = cfg.name;
    this.option = cfg.option;
    this.interval = cfg.interval;
    this.maxCount = cfg.maxCount;
    this.anonyReferenceTable = cfg.anonyReferenceTable;
    this.preprocessor = cfg.preprocessor;
    this.parser = cfg.parser;
    this.terminator = cfg.terminator;
    this.proxyArray = [];
  }

  setHeaders() {
    this.option.headers = {
      'Accept': 'application/json, text/javascript, text/plain, */*',
      'Accept-Encoding': 'gzip, deflate',
      'Accept-Language': 'zh-CN,zh;q=0.8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
      'X-Requested-With': 'XMLHttpRequest',
    };
  }

  setIntervalValue() {
    this.intervalValue = {};
    Object.keys(this.interval).map((type) => {
      this.intervalValue[type] = util.getMilliSecond(this.interval[type]);
    });
  }

};
