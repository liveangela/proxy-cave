const spider = require('./spider');
const service = require('./service');

service.registRouter('/collect', spider.getCollectorResult);
service.registRouter('/validate', spider.getValidatorResult);
service.start();
spider.start();
