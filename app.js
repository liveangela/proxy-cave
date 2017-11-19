const spider = require('./spider');
const service = require('./service');

spider.start();

service.registRouter('/collect', spider.getCollectResult);
service.start();
