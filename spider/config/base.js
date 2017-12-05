const util = require('../util');

class Base {

  constructor(type, params) {
    this.type = type; // resource, validation or ipdetail
    this.initParams(params);
    this.setIntervalValue();
  }

  initParams(params) {
    Object.keys(params).map((key) => {
      this[key] = JSON.parse(JSON.stringify(params[key]));
    });
    this.option.time = true; // all type
    this.option.proxy = 'http://1.1.1.1:80'; // a fake proxy to make the real ip hidden
    switch (this.type) {
      case 'resource':
        this.option.timeout = 30000;
        this.option.headers = {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate',
          'Accept-Language': 'zh-CN,zh;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
        };
        this.optionCopy = JSON.parse(JSON.stringify(this.option));
        break;
      case 'validation':
        this.proxyArray = [];
        this.option.timeout = 60000;
        this.option.headers = {
          'Accept': 'application/json, text/javascript, text/plain, */*',
          'Accept-Encoding': 'gzip, deflate',
          'Accept-Language': 'zh-CN,zh;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
          'X-Requested-With': 'XMLHttpRequest',
        };
        break;
      case 'ipdetail':
        this.option.timeout = 10000;
        break;
      default:
        console.error(`[SpiderBaseConfig]: Failed to initParams - unknown type "${this.type}"`);
    }
  }

  getTitle() {
    let title = '';
    if ('resource' === this.type) {
      title = this.name + (this.iterator ? '/' + this.optionCopy.page : '');
    } else {
      console.warn(`[SpiderBaseConfig]: GetTitle method is only for type "resource", not for "${this.type}"`);
    }
    return title;
  }

  resetOption() {
    if ('resource' === this.type) {
      this.optionCopy = JSON.parse(JSON.stringify(this.option));
    } else {
      console.warn(`[SpiderBaseConfig]: ResetOption method is only for type "resource", not for "${this.type}"`);
    }
  }

  setIntervalValue() {
    this.intervalValue = {};
    Object.keys(this.interval).map((type) => {
      this.intervalValue[type] = util.getMilliSecond(this.interval[type]);
    });
  }

  setProxy(proxyObj) {
    const target = 'resource' === this.type ? 'optionCopy' : 'option';
    this[target].proxy = 'http://' + proxyObj.proxy;
    this[target].proxy_origin = proxyObj.proxy;
    this[target].proxy_verify_result_list = proxyObj.result_list;
  }

}

module.exports = Base;
