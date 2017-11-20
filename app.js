const spider = require('./spider');
const service = require('./service');

spider.start();

service.registRouter('/collect', spider.getCollectorResult);
service.registRouter('/validate', spider.getValidatorResult);
service.start();
