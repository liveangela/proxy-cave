const Koa = require('koa');
const http = require('http');
const socketIO = require('socket.io');
const config = require('./config.json');
const router = require('./router');
const statics = require('koa-static');

class Service {
  constructor() {
    this.app = new Koa();
    this.server = http.Server(this.app.callback());
    this.initSocket();
  }

  initSocket() {
    this.io = socketIO(this.server);
    this.io.on('connection', (socket) => {
      console.log(`[Service]: Socket[${socket.id}] connected from "${socket.conn.remoteAddress}"`);
      socket.on('disconnect', () => {
        console.log(`[Service]: Socket[${socket.id}] disconnected from "${socket.conn.remoteAddress}"`);
      });
    });
  }

  start() {
    this.app.use(router.routes());
    this.app.use(statics(__dirname + '/../public'));
    this.server.listen(process.env.port || config.port);
    console.log(`[Service]: Server listen on port ${config.port}...`);
    return this.io;
  }

}

module.exports = new Service();
