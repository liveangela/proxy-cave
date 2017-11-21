const spider = require('./spider');
const service = require('./service');

service.registRouter('/collect', spider.getCollectorResult);
service.registRouter('/validate', spider.getValidatorResult);
service.registRouter('/ipdetail', spider.getIpDetailResult);
service.start();
spider.start();
