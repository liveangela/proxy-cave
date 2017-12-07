const request = require('request');
const database = require('../../database');

class Dispatcher {

  sendRequest(op) {
    return new Promise((resolve, reject) => {
      request(op, (err, res, body) => {
        const timeUsed = res && res.timings && Math.round(res.timings.end);
        let result = false;
        if (err) {
          reject(err);
        } else if (200 !== res.statusCode) {
          reject(new Error('Server error: ' + res.statusCode));
        } else if (0 == res.headers['content-length'] || !body.trim()) {
          reject(new Error('Server reject: content-length is 0'));
        } else {
          result = true;
          resolve({
            body,
            timeUsed,
          });
        }
        this.storeProxyTestResult({
          result,
          timeUsed,
          op,
        });
      });
    });
  }

  storeProxyTestResult(set) {
    const { op, result, timeUsed } = set;
    if (op.proxy && op.proxy_origin) {
      const verify_hit = [];
      const verify_use = [];
      if (op.proxy_verify_result_list) {
        Object.entries(op.proxy_verify_result_list).map((entry) => {
          if (undefined !== entry[1].verify_result) {
            verify_use.push(entry[0]);
            if (entry[1].verify_result === result) verify_hit.push(entry[0]);
          }
        });
      } else {
        throw new Error(`[Dispatcher]: Unknown proxy verify result of "${op.proxy_origin}"`);
      }
      const data = {
        result,
        verify_hit,
        verify_use,
        proxy: op.proxy_origin,
        target: op.targetURI,
      };
      if (result && timeUsed) data.delay = timeUsed;
      database.storeTestResult(data);
    }
  }

}

module.exports = new Dispatcher();
