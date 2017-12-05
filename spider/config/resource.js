const cheerio = require('cheerio');
const Base = require('./base');
const config = {};

// 66ip
config['66ip'] = class extends Base {

  constructor(name) {
    super('resource', {
      name,
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
        normal: '5m',
        error: '1m',
        period: null
      },
    });
  }

  parser(body) {
    return body.match(/\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}:\d{1,4}/g) || [];
  }

};

// bugng api
config['bugng_api'] = class extends Base {

  constructor(name) {
    super('resource', {
      name,
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
        error: '1m',
        period: null
      },
    });
  }

  parser(body) {
    const data = JSON.parse(body);
    let res = [];
    if (data && 0 === data.code) {
      const proxyList = data.data.proxy_list;
      if (proxyList && proxyList.length > 0) {
        res = proxyList;
      }
    }
    return res;
  }

};

// bugng all pages
config['bugng_site'] = class extends Base {

  constructor(name) {
    super('resource', {
      name,
      option: {
        uri: 'http://www.bugng.com/gngn',
        qs: {
          page: 0,
        },
        page: 0,
        gzip: true,
      },
      interval: {
        normal: '1m',
        error: '1m',
        period: '1h',
      },
    });
  }

  parser(body) {
    const $ = cheerio.load(body);
    const res = [];
    $('#target tr').map((i, el) => {
      const td = $(el).children('td');
      res.push(td.eq(0).text() + ':' + td.eq(1).text());
    });
    return res;
  }

  iterator(page) {
    this.option.qs.page = page || this.option.qs.page + 1;
    this.option.page = page || this.option.page + 1;
  }

  terminator(body) {
    const $ = cheerio.load(body);
    return 0 === $('#target').find('tr').length;
  }

};

// superfastip all pages
config['superfastip'] = class extends Base {

  constructor(name) {
    super('resource', {
      name,
      option: {
        uri: 'http://superfastip.com/welcome/getips/1',
        baseuri: 'http://superfastip.com/welcome/getips/',
        page: 1,
        gzip: true,
      },
      interval: {
        normal: '1m',
        error: '1m',
        period: '2h',
      },
    });
  }

  parser(body) {
    const $ = cheerio.load(body);
    const res = [];
    $('#iptable11 tr').map((i, el) => {
      const td = $(el).children('td');
      const host = td.eq(2).text();
      const port = td.eq(3).text();
      if (host && port) res.push(host + ':' + port);
    });
    return res;
  }

  iterator(page) {
    this.option.page = page || this.option.page + 1;
    this.option.uri = this.option.baseuri + this.option.page;
  }

  terminator(body) {
    const $ = cheerio.load(body);
    return 0 === $('#iptable11').length;
  }

};

// ip181 all pages
config['ip181_site'] = class extends Base {

  constructor(name) {
    super('resource', {
      name,
      option: {
        uri: 'http://www.ip181.com/daili/1.html',
        baseuri: 'http://www.ip181.com/daili/',
        page: 1,
        totalPage: null,
        gzip: true,
      },
      interval: {
        normal: '2m',
        error: '1m',
        period: null,
      },
    });
  }

  parser(body) {
    const $ = cheerio.load(body);
    const res = [];
    $('table.ctable tr').first().nextAll().map((i, el) => {
      const td = $(el).children('td');
      res.push(td.eq(0).text() + ':' + td.eq(1).text());
    });
    if (null === this.option.totalPage && res.length > 0) {
      const a = $('.page').first().find('a');
      const index = a.length - 3;
      this.option.totalPage = parseInt(a.eq(index).text(), 10);
    }
    return res;
  }

  iterator(page) {
    this.option.page = page || this.option.page + 1;
    this.option.uri = this.option.baseuri + this.option.page + '.html';
  }

  terminator() {
    return this.option.totalPage ? (this.option.page >= this.option.totalPage) : false;
  }

};

// ip181 page
config['ip181_page'] = class extends Base {

  constructor(name) {
    super('resource', {
      name,
      option: {
        uri: 'http://www.ip181.com/',
        gzip: true,
      },
      interval: {
        normal: '10m',
        error: '1m',
        period: null,
      },
    });
  }

  parser(body) {
    const $ = cheerio.load(body);
    const res = [];
    $('table.ctable tr').first().nextAll().map((i, el) => {
      const td = $(el).children('td');
      res.push(td.eq(0).text() + ':' + td.eq(1).text());
    });
    return res;
  }

};

// xici all pages
config['xici_site'] = class extends Base {

  constructor(name) {
    super('resource', {
      name,
      option: {
        uri: 'http://www.xicidaili.com/nn/1',
        baseuri: 'http://www.xicidaili.com/nn/',
        page: 1,
        totalPage: null,
        gzip: true,
      },
      interval: {
        normal: '2m',
        error: '1m',
        period: null,
      },
    });
  }

  parser(body) {
    const $ = cheerio.load(body);
    const res = [];
    $('#ip_list tr').first().nextAll().map((i, el) => {
      const td = $(el).children('td');
      res.push(td.eq(1).text() + ':' + td.eq(2).text());
    });
    if (null === this.option.totalPage && res.length > 0) {
      const a = $('.pagination').first().find('a');
      const index = a.length - 2;
      this.option.totalPage = parseInt(a.eq(index).text(), 10);
    }
    return res;
  }

  iterator(page) {
    this.option.page = page || this.option.page + 1;
    this.option.uri = this.option.baseuri + this.option.page;
  }

  terminator() {
    return this.option.totalPage ? (this.option.page >= this.option.totalPage) : false;
  }

};

// xici page
config['xici_page'] = class extends Base {

  constructor(name) {
    super('resource', {
      name,
      option: {
        uri: 'http://www.xicidaili.com/nn/',
        gzip: true,
      },
      interval: {
        normal: '1h',
        error: '1m',
        period: null,
      },
    });
  }

  parser(body) {
    const $ = cheerio.load(body);
    const res = [];
    $('#ip_list tr').first().nextAll().map((i, el) => {
      const td = $(el).children('td');
      res.push(td.eq(1).text() + ':' + td.eq(2).text());
    });
    return res;
  }

};

// xdaili
config['xdaili'] = class extends Base {

  constructor(name) {
    super('resource', {
      name,
      option: {
        uri: 'http://www.xdaili.cn/ipagent//freeip/getFreeIps',
        qs: {
          page: 1,
          rows: 10,
        },
      },
      interval: {
        normal: '10m',
        error: '1m',
        period: null
      },
    });
  }

  parser(body) {
    const data = JSON.parse(body);
    let res = [];
    if (data && '0' === data['ERRORCODE']) {
      const proxyList = data['RESULT'].rows;
      if (proxyList && proxyList.length > 0) {
        proxyList.map((each) => {
          res.push(each.ip + ':' + each.port);
        });
      }
    }
    return res;
  }

};

// ip3366 all pages
config['ip3366_site'] = class extends Base {

  constructor(name) {
    super('resource', {
      name,
      option: {
        uri: 'http://www.ip3366.net/',
        qs: {
          stype: 1,
          page: 1,
        },
        page: 1,
        totalPage: 10,
        gzip: true,
      },
      interval: {
        normal: '2m',
        error: '1m',
        period: null,
      },
    });
  }

  parser(body) {
    const $ = cheerio.load(body);
    const res = [];
    $('#list table tbody tr').map((i, el) => {
      const td = $(el).children('td');
      res.push(td.eq(0).text() + ':' + td.eq(1).text());
    });
    return res;
  }

  iterator(page) {
    this.option.qs.page = page || this.option.qs.page + 1;
    this.option.page = page || this.option.page + 1;
  }

  terminator() {
    return this.option.page >= this.option.totalPage;
  }

};

// ip3366 page
config['ip3366_page'] = class extends Base {

  constructor(name) {
    super('resource', {
      name,
      option: {
        uri: 'http://www.ip3366.net/',
        gzip: true,
      },
      interval: {
        normal: '30m',
        error: '1m',
        period: null,
      },
    });
  }

  parser(body) {
    const $ = cheerio.load(body);
    const res = [];
    $('#list table tbody tr').map((i, el) => {
      const td = $(el).children('td');
      res.push(td.eq(0).text() + ':' + td.eq(1).text());
    });
    return res;
  }

};

// kuaidaili all pages
config['kuaidaili_site'] = class extends Base {

  constructor(name) {
    super('resource', {
      name,
      option: {
        uri: 'http://www.kuaidaili.com/free/inha/1/',
        baseuri: 'http://www.kuaidaili.com/free/inha/',
        page: 1,
        totalPage: null,
        gzip: true,
      },
      interval: {
        normal: '2m',
        error: '1m',
        period: null,
      },
    });
  }

  parser(body) {
    const $ = cheerio.load(body);
    const res = [];
    $('#list table tbody tr').map((i, el) => {
      const td = $(el).children('td');
      res.push(td.eq(0).text() + ':' + td.eq(1).text());
    });
    if (null === this.option.totalPage && res.length > 0) {
      const a = $('#listnav').find('a').last();
      this.option.totalPage = parseInt(a.text(), 10);
    }
    return res;
  }

  iterator(page) {
    this.option.page = page || this.option.page + 1;
    this.option.uri = this.option.baseuri + this.option.page + '/';
  }

  terminator() {
    return this.option.totalPage ? (this.option.page >= this.option.totalPage) : false;
  }

};

// kuaidaili page
config['kuaidaili_page'] = class extends Base {

  constructor(name) {
    super('resource', {
      name,
      option: {
        uri: 'http://www.kuaidaili.com/free/',
        gzip: true,
      },
      interval: {
        normal: '1h',
        error: '1m',
        period: null,
      },
    });
  }

  parser(body) {
    const $ = cheerio.load(body);
    const res = [];
    $('#list table tbody tr').map((i, el) => {
      const td = $(el).children('td');
      res.push(td.eq(0).text() + ':' + td.eq(1).text());
    });
    return res;
  }

};

// yaoyao all pages
config['httpsdaili_site'] = class extends Base {

  constructor(name) {
    super('resource', {
      name,
      option: {
        uri: 'http://www.httpsdaili.com/',
        qs: {
          page: 1,
        },
        page: 1,
        totalPage: null,
        gzip: true,
      },
      interval: {
        normal: '2m',
        error: '1m',
        period: null,
      },
    });
  }

  parser(body) {
    const $ = cheerio.load(body);
    const res = [];
    $('#list table tbody tr').map((i, el) => {
      const td = $(el).children('td');
      res.push(td.eq(0).text() + ':' + td.eq(1).text());
    });
    if (null === this.option.totalPage && res.length > 0) {
      const href = $('#listnav').find('a').last().attr('href');
      const page = href.match(/\d+/)[0];
      this.option.totalPage = parseInt(page, 10);
    }
    return res;
  }

  iterator(page) {
    this.option.qs.page = page || this.option.qs.page + 1;
    this.option.page = page || this.option.page + 1;
  }

  terminator() {
    return this.option.totalPage ? (this.option.page >= this.option.totalPage) : false;
  }

};

// yaoyao page
config['httpsdaili_page'] = class extends Base {

  constructor(name) {
    super('resource', {
      name,
      option: {
        uri: 'http://www.httpsdaili.com',
        gzip: true,
      },
      interval: {
        normal: '3h',
        error: '1m',
        period: null,
      },
    });
  }

  parser(body) {
    const $ = cheerio.load(body);
    const res = [];
    $('#list table tbody tr').map((i, el) => {
      const td = $(el).children('td');
      res.push(td.eq(0).text() + ':' + td.eq(1).text());
    });
    return res;
  }

};

// nianshao all pages
config['nianshao_site'] = class extends Base {

  constructor(name) {
    super('resource', {
      name,
      option: {
        uri: 'http://www.nianshao.me/',
        qs: {
          page: 1,
        },
        page: 1,
        gzip: true,
      },
      interval: {
        normal: '2m',
        error: '1m',
        period: null,
      },
    });
  }

  parser(body) {
    const $ = cheerio.load(body);
    const res = [];
    $('#main .mainPanel table tbody tr').map((i, el) => {
      const td = $(el).children('td');
      res.push(td.eq(0).text() + ':' + td.eq(1).text());
    });
    return res;
  }

  iterator(page) {
    this.option.qs.page = page || this.option.qs.page + 1;
    this.option.page = page || this.option.page + 1;
  }

  terminator(body) {
    return !body.trim();
  }

};

// nianshao page
config['nianshao_page'] = class extends Base {

  constructor(name) {
    super('resource', {
      name,
      option: {
        uri: 'http://www.nianshao.me/',
        gzip: true,
      },
      interval: {
        normal: '10m',
        error: '1m',
        period: null,
      },
    });
  }

  parser(body) {
    const $ = cheerio.load(body);
    const res = [];
    $('#main .mainPanel table tbody tr').map((i, el) => {
      const td = $(el).children('td');
      res.push(td.eq(0).text() + ':' + td.eq(1).text());
    });
    return res;
  }

};

// seofangfa page
config['seofangfa'] = class extends Base {

  constructor(name) {
    super('resource', {
      name,
      option: {
        uri: 'http://ip.seofangfa.com/',
        gzip: true,
      },
      interval: {
        normal: '20m',
        error: '1m',
        period: null,
      },
    });
  }

  parser(body) {
    const $ = cheerio.load(body);
    const res = [];
    $('.table-responsive table tbody tr').map((i, el) => {
      const td = $(el).children('td');
      res.push(td.eq(0).text() + ':' + td.eq(1).text());
    });
    return res;
  }

};

// shandian page
config['baizhongsou'] = class extends Base {

  constructor(name) {
    super('resource', {
      name,
      option: {
        uri: 'http://ip.baizhongsou.com/',
        gzip: true,
      },
      interval: {
        normal: '30m',
        error: '1m',
        period: null,
      },
    });
  }

  parser(body) {
    const $ = cheerio.load(body);
    const res = [];
    $('.daililist table tr').first().nextAll().map((i, el) => {
      const td = $(el).children('td');
      const proxy = td.eq(0).text();
      if (proxy) res.push(proxy);
    });
    return res;
  }

};

// wuyou page
config['data5u'] = class extends Base {

  constructor(name) {
    super('resource', {
      name,
      option: {
        uri: 'http://www.data5u.com/free/gngn/index.shtml',
        gzip: true,
      },
      interval: {
        normal: '2m',
        error: '1m',
        period: null,
      },
    });
  }

  parser(body) {
    const $ = cheerio.load(body);
    const res = [];
    $('ul.l2').map((i, el) => {
      const spans = $(el).children('span');
      const proxy = spans.eq(0).find('li').first().text();
      const port = spans.eq(1).find('li').first().text();
      res.push(proxy + ':' + port);
    });
    return res;
  }

};

module.exports = config;
