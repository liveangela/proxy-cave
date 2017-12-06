const Base = require('./base');
const config = {};

// taobao
config['taobao'] = class extends Base {

  constructor(name) {
    super('ipdetail', {
      name,
      option: {
        uri: 'http://ip.taobao.com/service/getIpInfo.php',
        qs: {
          ip: null,
        },
      },
      interval: {
        normal: '30s',
        error: '5s',
      },
    });
  }

  preprocessor(ip) {
    this.option.qs.ip = ip;
  }

  parser(body) {
    const res = JSON.parse(body);
    return 0 === res.code ? [res.data] : [];
  }

};

module.exports = config;
