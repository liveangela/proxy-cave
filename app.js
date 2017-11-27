const database = require('./database');
const service = require('./service');
const spider = require('./spider');

database.start().then(() => {
  service.start();
  spider.start();
});
