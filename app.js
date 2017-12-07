const database = require('./database');
const service = require('./service');
const spider = require('./spider');

database.start().then(() => {
  const io = service.start();
  spider.injectSocket(io);
  spider.start();
});
