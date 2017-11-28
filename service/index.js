const Koa = require('koa');
const config = require('./config.json');
const router = require('./router');

class Service {
  constructor() {
    this.app = new Koa();
    this.registRouter();
  }

  registRouter() {
    router.map((each) => {
      this.app.use(async (ctx, next) => {
        if (each.path === ctx.path) {
          ctx.body = await each.getter();
        } else {
          await next();
        }
      });
    });
  }

  start() {
    this.app.use(async (ctx) => {
      ctx.body = 'Welcome';
    });
    this.app.listen(config.port);
    console.log(`[Service]: Server listen on port ${config.port}...`);
  }

}

module.exports = new Service();
