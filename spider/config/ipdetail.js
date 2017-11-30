module.exports = {
  option: {
    uri: 'http://ip.taobao.com/service/getIpInfo.php',
    qs: {
      ip: null,
    },
    timeout: 10000,
  },
  interval: {
    normal: '5s',
    error: '30s',
  },
  parser(body) {
    const res = JSON.parse(body);
    return 0 === res.code ? res.data : null;
  },
};
