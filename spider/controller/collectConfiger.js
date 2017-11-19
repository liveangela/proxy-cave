module.exports = class Config {
  
  constructor(cfg) {
    this.bind(cfg);
    this.setHeaders();
    this.resetOption();
    this.setIntervalValue();
  }

  bind(cfg) {
    this.name = cfg.name;
    this.option = cfg.option;
    this.interval = cfg.interval;
    this.parser = cfg.parser;
    this.iterator = cfg.iterator;
    this.terminator = cfg.terminator;

    // if (this.iterator) this.iterator = this.iterator.bind(this);
  }
  
  getMilliSecond(timestring) {
    if (!timestring) return null;
    const [, num, type] = timestring.match(/(\d+)(\w)/);
    let modifier = 1;
    switch (type) {
      case 'ms': break;
      case 's': modifier *= 1000; break;
      case 'm': modifier *= 60 * 1000; break;
      case 'h': modifier *= 3600 * 1000; break;
      case 'd': modifier *= 24 * 3600 * 1000; break;
      default:
        throw new Error(`[Config Resource]: Unknown interval type - ${timestring}`);
    }
    return parseFloat(num) * modifier;
  }
  
  resetOption() {
    this.optionCopy = JSON.parse(JSON.stringify(this.option));
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
      this.intervalValue[type] = this.getMilliSecond(this.interval[type]);
    });
  }
  
};
  