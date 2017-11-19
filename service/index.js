const Koa = require('koa');
const config = require('./config.json');

class Service {
  constructor() {
    this.app = new Koa();
  }

  registRouter(name, getter) {
    this.app.use(async (ctx, next) => {
      if (name === ctx.path) {
        ctx.body = getter();
      } else {
        await next();
      }
    });
  }

  start() {
    this.app.use(async (ctx) => {
      ctx.body = 'Welcome';
    });
    this.app.listen(config.port);
    console.log(`[Server]: Listen on port ${config.port}...`);
  }

}

module.exports = new Service();