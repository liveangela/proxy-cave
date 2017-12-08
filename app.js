const database = require('./database');
const service = require('./service');
const spider = require('./spider');
const logger = require('./logger');

database.injectLogger(logger);
service.injectLogger(logger);
spider.injectLogger(logger);

database.start().then(() => {
  const io = service.start();
  spider.injectSocket(io);
  spider.start();
});
