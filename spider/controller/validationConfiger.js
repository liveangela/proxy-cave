const util = require('../util');

module.exports = class ValidationConfiger {

  constructor(cfg) {
    this.init(cfg);
    this.setHeaders();
    this.setIntervalValue();
  }

  init(cfg) {
    Object.keys(cfg).map((key) => {
      this[key] = cfg[key];
    });
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

  setProxy(proxyObj) {
    this.option.proxy = 'http://' + proxyObj.proxy;
    this.option.proxy_origin = proxyObj.proxy;
    this.option.proxy_verify_result_list = proxyObj.result_list;
  }

};
