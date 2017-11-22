module.exports = {
  option: {
    uri: 'http://ip.taobao.com/service/getIpInfo.php',
    qs: {
      ip: null,
    },
  },
  interval: {
    normal: '10s',
    error: '1m',
  },
  parser(body) {
    const res = JSON.parse(body);
    return 0 === res.code ? res.data : null;
  },
};
