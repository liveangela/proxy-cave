const config = {};

// xundaili
config['xdaili'] = {
  option: {
    baseuri: 'http://www.xdaili.cn/ipagent//checkIp/ipList',
    uri: null,
  },
  interval: {
    normal: '1m',
    error: '2m',
    period: null,
  },
  maxCount: 50,
  anonyReferenceTable: {
    '透明': 0,
    '普匿': 1,
    '高匿': 2,
    '超匿': 3
  },
  preprocessor() {
    const set = this.proxyArray.map((each) => {
      return 'ip_ports[]=' + each.proxy;
    });
    this.option.uri = this.option.baseuri + '?' + set.join('&');
  },
  parser(body) {
    const res = JSON.parse(body);
    const data = [];
    if ('0' === res['ERRORCODE']) {
      const ts = Date.now();
      res['RESULT'].map((set) => {
        const base = {
          proxy: set.ip + ':' + set.port,
          from: this.name,
          verify_time: ts,
        };
        const other = {};
        if (set.anony && set.time) {
          const anony = this.anonyReferenceTable[set.anony.replace(/"/g, '')];
          other.verify_result = true;
          other.delay = parseInt(set.time.match(/\d+/)[0]);
          other.anonymous_level = undefined === anony ? 4 : anony;
        } else {
          other.verify_result = false;
        }
        data.push(Object.assign({}, base, other));
      });
    }
    this.proxyArray = []; // reset manually
    return data;
  },
  terminator: null
};

// mayidaili
config['mayidaili'] = {
  option: {
    uri: 'http://www.mayidaili.com/proxy/get-proxy-info/',
    method: 'POST',
    form: {
      proxys: null,
    },
    requestCount: 0,
  },
  interval: {
    normal: '5s',
    error: '30s',
    period: '5m',
  },
  maxCount: 50,
  anonyReferenceTable: [, 2, 1, 0],
  preprocessor() {
    const set = this.proxyArray.map((each) => {
      return {
        host: each.host,
        port: each.port,
      };
    });
    this.option.form.proxys = JSON.stringify(set);
    this.option.requestCount += 1;
  },
  parser(body) {
    const res = JSON.parse(body);
    const data = [];
    const succMap = {};
    const ts = Date.now();
    const proxyArray = this.proxyArray;
    res.data.map((set) => {
      const anony = this.anonyReferenceTable[set.anonymous_level];
      const proxy = set.host + ':' + set.port;
      data.push({
        proxy,
        from: this.name,
        verify_result: true,
        verify_time: ts,
        delay: set.n0,
        anonymous_level: undefined === anony ? 4 : anony,
      });
      // create a map for the followed comparation
      succMap[proxy] = true;
    });
    // compare and splice the success one from this.proxyArray
    for (let i = proxyArray.length - 1, count = 0; i >= 0; i--) {
      if (count >= data.length) break;
      if (succMap[proxyArray[i].proxy]) {
        proxyArray.splice(i, 1);
        count += 1;
      }
    }
    return data;
  },
  terminator() {
    const res = this.option.requestCount >= 10 || this.proxyArray.length <= 0;
    if (res) {
      this.proxyArray = []; // reset manually
      this.option.requestCount = 0;
    }
    return res;
  },
};

Object.keys(config).map((key) => {
  config[key].name = key;
});

module.exports = config;
