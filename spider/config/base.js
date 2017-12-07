const util = require('../util');

class Base {

  constructor(type, params) {
    if (['resource', 'validation', 'ipdetail'].includes(type)) {
      this.type = type;
      this.initParams(params);
      this.setIntervalValue();
    } else {
      throw new Error(`[SpiderBaseConfig]: Failed to init config for unknown type "${type}"`);
    }
  }

  initParams(params) {
    Object.keys(params).map((key) => {
      this[key] = JSON.parse(JSON.stringify(params[key]));
    });
    this.option.time = true;
    this.option.targetURI = this.getTargetURI(this.option.baseuri || this.option.uri);
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
    }
  }

  getTargetURI(uri) {
    const regExp = /(http|https):\/\/(www.)?(\w+(\.)?)+/;
    const res = uri.match(regExp);
    if (!res) throw new Error(`[SpiderBaseConfig]: Failed to compile uri "${uri}"`);
    return res[0];
  }

  getTitle() {
    let title = this.name;
    if ('resource' === this.type && this.iterator) {
      title += '/' + this.option.page;
    }
    return title;
  }

  resetOption() {
    if ('resource' === this.type) {
      const proxyObj = {
        proxy: this.option.proxy_origin,
        result_list: this.option.proxy_verify_result_list,
      };
      this.option = JSON.parse(JSON.stringify(this.optionCopy));
      this.setProxy(proxyObj);
    } else {
      throw new Error(`[SpiderBaseConfig]: ResetOption method is only for type "resource", not for "${this.type}"`);
    }
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

}

module.exports = Base;
