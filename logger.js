const log4js = require('log4js');

const logLayout = {
  type: 'pattern',
  pattern: '[%d] [%p] %m%n',
};

log4js.configure({
  appenders: {
    all: {
      type: 'dateFile',
      layout: logLayout,
      filename: './logs/all.log',
      keepFileExt: true,
    },
    error: {
      type: 'file',
      layout: logLayout,
      filename: './logs/error.log',
    },
    errorFilter: {
      type: 'logLevelFilter',
      appender: 'error',
      level: 'error',
    },
  },
  categories: {
    default: {
      appenders: ['all', 'errorFilter'],
      level: 'debug',
    },
  },
});

module.exports = log4js.getLogger();
