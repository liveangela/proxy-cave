const request = require('request');

class Dispatch {

  sendRequest(op) {
    return new Promise((resolve, reject) => {
      request(op, (err, res, body) => {
        if (err) {
          reject(err);
        } else if (200 !== res.statusCode) {
          reject(new Error('Server error: ' + res.statusCode));
        } else if (0 == res.headers['content-length']) {
          reject(new Error('Server reject: content-length is 0'));
        } else {
          resolve(body);
        }
      });
    });
  }

}

module.exports = new Dispatch();