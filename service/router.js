const fs = require('fs');
const Router = require('koa-router');
const database = require('../database');

const router = new Router();

router.get('/', (ctx) => {
  ctx.type = 'html';
  ctx.body = fs.createReadStream(__dirname + '/../public/html/index.html');
});

router.get('/api/stats', async (ctx) => {
  ctx.type = 'json';
  ctx.body = await database.getStats();
});

module.exports = router;
