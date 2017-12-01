const request = require('request');
const database = require('../../database');

class Dispatcher {

  sendRequest(op) {
    return new Promise((resolve, reject) => {
      request(op, (err, res, body) => {
        let result = false;

        if (err) {
          reject(err);
        } else if (200 !== res.statusCode) {
          reject(new Error('Server error: ' + res.statusCode));
        } else if (0 == res.headers['content-length']) {
          reject(new Error('Server reject: content-length is 0'));
        } else {
          result = true;
          resolve(body);
        }

        if (op.proxy) {
          const verify_hit = [];
          if (op.proxy_verify_result_list) {
            Object.entries(op.proxy_verify_result_list).map((entry) => {
              if (entry[1].verify_result) verify_hit.push(entry[0]);
            });
          }
          this.storeProxyTestResult({
            result,
            verify_hit,
            proxy: op.proxy_origin,
            target: op.baseuri || op.uri,
          });
        }
      });
    });
  }

  storeProxyTestResult(data) {
    database.storeTestResult(data);
  }

}

module.exports = new Dispatcher();
