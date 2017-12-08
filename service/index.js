const Koa = require('koa');
const http = require('http');
const socketIO = require('socket.io');
const config = require('./config.json');
const router = require('./router');
const statics = require('koa-static');

class Service {
  constructor() {
    this.app = new Koa();
    this.app.use(router.routes());
    this.app.use(statics(__dirname + '/../public'));
    this.server = http.Server(this.app.callback());
  }

  initSocket() {
    const io = socketIO(this.server);
    io.on('connection', (socket) => {
      this.logger.info(`[Service]: Socket[${socket.id}] connected from "${socket.conn.remoteAddress}"`);
      socket.on('disconnect', () => {
        this.logger.info(`[Service]: Socket[${socket.id}] disconnected from "${socket.conn.remoteAddress}"`);
      });
    });
    return io;
  }

  injectLogger(logger) {
    this.logger = logger;
  }

  start() {
    const io = this.initSocket();
    this.server.listen(process.env.port || config.port);
    this.logger.info(`[Service]: Server listen on port ${config.port}...`);
    return io;
  }

}

module.exports = new Service();
