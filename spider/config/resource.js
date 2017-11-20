const cheerio = require('cheerio');
const config = {};

// 66ip
config['66ip'] = {
  option: {
    uri: 'http://www.66ip.cn/nmtq.php',
    qs: {
      getnum: 800,
      isp: 0,
      anonymoustype: 0,
      area: 1,
      proxytype: 2,
      api: '66ip',
    },
    gzip: true,
  },
  interval: {
    normal: '2m',
    error: '2m',
    period: null
  },
  parser: (body) => {
    return body.match(/\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}:\d{1,4}/g);
  },
  iterator: null,
  terminator: null,
};

// bugng api
config['bugng_api'] = {
  option: {
    uri: 'http://www.bugng.com/api/getproxy/json',
    qs: {
      num: 80,
      anonymity: 0,
      type: 0,
    },
  },
  interval: {
    normal: '5m',
    error: '10m',
    period: null
  },
  parser: (body) => {
    const data = JSON.parse(body);
    let res = [];
    if (data && 0 === data.code) {
      const proxyList = data.data.proxy_list;
      if (proxyList && proxyList.length > 0) {
        res = proxyList;
      }
    }
    return res;
  },
  iterator: null,
  terminator: null,
};

// bugng all pages
config['bugng_site'] = {
  option: {
    uri: 'http://www.bugng.com/gngn',
    qs: {
      page: 0,
    },
    page: 0,
    gzip: true,
  },
  interval: {
    normal: '5s',
    error: '20s',
    period: '2h',
  },
  parser: (body) => {
    const $ = cheerio.load(body);
    const res = [];
    $('#target tr').map((i, el) => {
      const td = $(el).children('td');
      res.push(td.eq(0).text() + ':' + td.eq(1).text());
    });
    return res;
  },
  iterator () {
    this.optionCopy.qs.page += 1;
    this.optionCopy.page += 1;
  },
  terminator: (body) => {
    const $ = cheerio.load(body);
    return 0 === $('#target').find('tr').length;
  },
};

// superfastip all pages
config.superfastip = {
  option: {
    uri: 'http://superfastip.com/welcome/getips/1',
    baseuri: 'http://superfastip.com/welcome/getips/',
    page: 1,
    gzip: true,
  },
  interval: {
    normal: '5s',
    error: '20s',
    period: '2h',
  },
  parser: (body) => {
    const $ = cheerio.load(body);
    const res = [];
    $('#iptable11 tr').map((i, el) => {
      const td = $(el).children('td');
      res.push(td.eq(1).text() + ':' + td.eq(2).text());
    });
    return res;
  },
  iterator () {
    this.optionCopy.page += 1;
    this.optionCopy.uri = this.optionCopy.baseuri + this.optionCopy.page;
  },
  terminator: (body) => {
    const $ = cheerio.load(body);
    return 0 === $('#iptable11').length;
  },
};

// ip181 all pages
config.ip181_site = {
  option: {
    uri: 'http://www.ip181.com/daili/1.html',
    baseuri: 'http://www.ip181.com/daili/',
    page: 1,
    totalPage: null,
    gzip: true,
  },
  interval: {
    normal: '5s',
    error: '20s',
    period: null,
  },
  parser (body) {
    const $ = cheerio.load(body);
    const res = [];
    $('table.ctable tr').first().nextAll().map((i, el) => {
      const td = $(el).children('td');
      res.push(td.eq(0).text() + ':' + td.eq(1).text());
    });
    if (null === this.optionCopy.totalPage) {
      const a = $('.page').first().find('a');
      const index = a.length - 3;
      this.optionCopy.totalPage = parseInt(a.eq(index).text(), 10);
    }
    return res;
  },
  iterator () {
    this.optionCopy.page += 1;
    this.optionCopy.uri = this.optionCopy.baseuri + this.optionCopy.page + '.html';
  },
  terminator () {
    return this.optionCopy.totalPage ? (this.optionCopy.page >= this.optionCopy.totalPage) : false;
  },
};

// ip181 page
config.ip181_page = {
  option: {
    uri: 'http://www.ip181.com/',
    gzip: true,
  },
  interval: {
    normal: '10m',
    error: '10m',
    period: null,
  },
  parser: (body) => {
    const $ = cheerio.load(body);
    const res = [];
    $('table.ctable tr').first().nextAll().map((i, el) => {
      const td = $(el).children('td');
      res.push(td.eq(0).text() + ':' + td.eq(1).text());
    });
    return res;
  },
  iterator: null,
  terminator: null,
};

// xici all pages
config.xici_site = {
  option: {
    uri: 'http://www.xicidaili.com/nn/1',
    baseuri: 'http://www.xicidaili.com/nn/',
    page: 1,
    totalPage: null,
    gzip: true,
  },
  interval: {
    normal: '10s',
    error: '1m',
    period: null,
  },
  parser (body) {
    const $ = cheerio.load(body);
    const res = [];
    $('#ip_list tr').first().nextAll().map((i, el) => {
      const td = $(el).children('td');
      res.push(td.eq(1).text() + ':' + td.eq(2).text());
    });
    if (null === this.optionCopy.totalPage) {
      const a = $('.pagination').first().find('a');
      const index = a.length - 2;
      this.optionCopy.totalPage = parseInt(a.eq(index).text(), 10);
    }
    return res;
  },
  iterator () {
    this.optionCopy.page += 1;
    this.optionCopy.uri = this.optionCopy.baseuri + this.optionCopy.page;
  },
  terminator () {
    return this.optionCopy.totalPage ? (this.optionCopy.page >= this.optionCopy.totalPage) : false;
  },
};

Object.keys(config).map((key) => {
  config[key].name = key;
});

module.exports = config;
