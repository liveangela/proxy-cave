const { database } = require('./database');
const service = require('./service');
const spider = require('./spider');

service.registRouter('/collect', spider.getCollectorResult);
service.registRouter('/validate', spider.getValidatorResult);
service.registRouter('/ipdetail', spider.getIpDetailResult);

database.start().then(() => {
  service.start();
  spider.start();
});
