const request = require('request');
const cheerio = require('cheerio');
const koa = require('koa');

/**
 * 配置
 */
const pool = {
  origin: [], // 原材料
  succ: {}, // 验证成功
  ip: [],
  detail: {}, // 详情补充
}
const requestOption = {
  ip66: {
    uri: 'http://www.66ip.cn/nmtq.php',
    qs: {
      getnum: 800,
      isp: 0,
      anonymoustype: 0,
      area: 1,
      proxytype: 2,
      api: '66ip',
    },
    gzip: true,
    headers: {
      "Accept": 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      "Accept-Encoding": 'gzip, deflate',
      "Accept-Language": 'zh-CN,zh;q=0.8',
      "Connection": 'keep-alive',
      "Host": 'www.66ip.cn',
      "User-Agent": 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
      "Upgrade-Insecure-Requests": 1,
    },
  },
  bugng: {
    uri: 'http://www.bugng.com/api/getproxy/json',
    qs: {
      num: 80,
      anonymity: 1,
      type: 0,
    },
  },
  superfast: {
    uri: 'http://superfastip.com/welcome/getapi',
  },
  xici: {
    uri: 'http://www.xicidaili.com/nn/',
    gzip: true,
    headers: {
      "Accept": 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      "Accept-Encoding": 'gzip, deflate',
      "Accept-Language": 'zh-CN,zh;q=0.8',
      "Connection": 'keep-alive',
      "Host": 'www.xicidaili.com',
      "User-Agent": 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
      "Upgrade-Insecure-Requests": 1,
    },
  },
  proxyCheck: {
    uri: 'http://www.mayidaili.com/proxy/get-proxy-info/',
    method: 'POST',
    headers: {
      "Host": 'www.mayidaili.com',
      "User-Agent": 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
    },
    form: {
      proxys: null
    },
  },
  ipDetail: {
    uri: 'http://ip.taobao.com/service/getIpInfo.php',
    qs: {
      ip: null
    }
  },
}
const timespan = {
  ip66: 60,
  bugng: 60,
  superfast: 120,
  xici: 60,
  proxyCheckOutside: 5,
  proxyCheckInside: 3,
  ipDetail: 3,
}
const dealFunc = {
  ip66: (body) => {
    return body.match(/\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}:\d{1,4}/g)
  },
  bugng: (body) => {
    const data = JSON.parse(body);
    return data && 0 === data.code && data.data.count > 0 ? data.data['proxy_list'] : [] ;
  },
  superfast: (body) => {
    const data = JSON.parse(body);
    return data && data.data.map((each) => `${each[1]}:${each[2]}`) || []
  },
  xici: (body) => {
    const $ = cheerio.load(body);
    const res = [];
    $('#ip_list tr').first().nextAll().map((i, el) => {
      const td = $(el).children('td');
      res.push(td.eq(1).text() + ':' + td.eq(2).text());
    })
    return res
  },
  proxyCheck: (body) => {
    const data = JSON.parse(body);
    return data.data
  },
  ipDetail: (body) => {
    const data = JSON.parse(body);
    return 0 === data.code ? data.data : null
  },
}
const sendRequest = (name, extra = {}) => {
  const op = Object.assign(requestOption[name], extra);
  return new Promise((resolve, reject) => {
    request(op, (err, res, body) => {
      if (extra.debug) {
        console.log('=========op========');
        console.log(op);
        console.log('=========body========');
        console.log(res.request);
      }
      if (err) {
        reject(err)
      } else if (200 !== res.statusCode) {
        reject(new Error('Server error: ' + res.statusCode))
      } else if (0 == res.headers['content-length']) {
        reject(new Error('Server reject: content-length is 0'))
      } else {
        resolve(dealFunc[name](body));
      }
    });
  });
}
const makeCompareTable = (array, key) => {
  const res = {};
  array.map(obj => {
    res[obj[key]] = obj;
  });
  return res;
}
const sleep = (seconds) => {
  return new Promise((resove) => {
    setTimeout(resove, seconds * 1000)
  })
}


/**
 * 源采集模块
 * 1）并发采集
 * 2）各自时间间隔
 */
const originName = ['ip66', 'bugng', 'superfast', 'xici']; // 采集源名称
const collectLoop = (name) => {
  const tspan = timespan[name];
  console.log(`[Collect]: Requesting for ${name}...`);
  sendRequest(name).then((res) => {
    const download_time = Date.now();
    const resNew = res.map(proxy => {
      return {
        proxy,
        download_time,
        from: name,
      }
    });
    pool.origin = [...pool.origin, ...resNew] // 没有去重必要，总会拿到重复的代理
    console.log(`[Collect]: +${res.length} proxies from ${name}, starting next request in ${tspan}s...`)
    setTimeout(() => collectLoop(name), tspan * 1000)
  }).catch((e) => {
    const tspan2 = tspan * 2;
    console.error(`[Collect]: Failed in ${name} - ${e}, request will restart in ${tspan}s...`)
    setTimeout(() => collectLoop(name), tspan2 * 1000)
  })
}
const startAllCollectLoop = () => {
  originName.map((name) => collectLoop(name));
}


/**
 * 验证模块
 * 1）周期性拿取，大循环
 * 2）返回请求直到全部成功或者超过次数限制，小循环
 */
const pickCount = 10;
const checkMaxCount = 5; // 小循环次数
const proxyObj2Str = (set) => {
  return set.map((each) => {
    return set.host + ':' + set.port
  })
}
const proxyStr2Obj = (set) => {
  return set.map((each) => {
    const arr = each.proxy.split(':');
    return {
      host: arr[0],
      port: arr[1]
    }
  })
}
const checkLoopInside = (set) => {
  return new Promise((resolve, reject) => {
    sendRequest('proxyCheck', {
      form: { proxys: JSON.stringify(set.fail) },
    }).then((res) => {
      const ts = Date.now()
      let fail = set.fail;
      res = res.map((each) => {
        fail = fail.filter((proxy) => {
          return !(each.host === proxy.host && each.port == proxy.port)
        })
        const succProxy = each.host + ':' + each.port;
        return Object.assign(each, set.compare[succProxy], {
          check_time: ts
        });
      })
      const succ = [...set.succ, ...res];
      resolve({
        succ,
        fail,
        compare: set.compare,
      })
    }).catch((e) => {
      console.error(`[Check Inside]: Request error - ${e}`);
    })
  })
}
const checkLoopOutside = (originProxy) => {
  return new Promise(async (resolve, reject) => {
    let set = {
      succ: [],
      fail: proxyStr2Obj(originProxy),
      compare: makeCompareTable(originProxy, 'proxy'),
    };
    for (let i = 0; i < checkMaxCount; i++) {
      if (0 === set.fail.length) break;
      // console.log(`[Check Inside]: Round ${i+1} started...`)
      set = await checkLoopInside(set);
      await sleep(timespan.proxyCheckInside);
    }
    resolve(set.succ)
  })
}
const startCheckLoop = () => {
  const originProxy = pool.origin.splice(0, pickCount);
  const tspan = timespan.proxyCheckOutside * 1000;
  if (originProxy.length > 0) {
    console.log(`[Check]: starting check loop for ${originProxy.length} proxies...`);
    checkLoopOutside(originProxy).then((res) => {
      res.map(each => {
        pool.succ[each.proxy] = each; // 有则更新，无则赋值
        pool.ip.push(each.host);
      });
      console.log(`[Check]: +${res.length} useful proxies, next check round will start in ${timespan.proxyCheckOutside}s...`);
      setTimeout(startCheckLoop, tspan)
    }).catch((e) => {
      console.error(`[Check]: Failed due to ${e}, restart in ${timespan.proxyCheckOutside}s...`);
      setTimeout(startCheckLoop, tspan)
    });
  } else {
    console.log(`[Check]: Empty origin pool, restart in ${timespan.proxyCheckOutside}s...`);
    setTimeout(startCheckLoop, tspan)
  }
}


/**
 * 补充详情模块
 */
const pickDetailIP = () => {
  let ip = pool.ip.shift(); // 永远是一个一个查询，目标api不支持批量
  if (ip) {
    if (pool.detail[ip]) {
      ip = pickDetailIP();
    }
  }
  return ip;
}
const startDetailLoop = () => {
  const tspan = timespan.ipDetail * 1000;
  const ip = pickDetailIP();
  if (ip) {
    console.log(`[Detail]: Requesting for ${ip}...`);
    sendRequest('ipDetail', {
      qs: { ip, }
    }).then((res) => {
      if (res) {
        pool.detail[res.ip] = res;
        console.log(`[Detail]: ${ip} detail done`);
      } else {
        console.warn(`[Detail]: invalid ip - ${ip}`);
      }
      setTimeout(startDetailLoop, tspan)
    }).catch((e) => {
      console.error(`[Detail]: Failed due to ${e}, restart in ${timespan.ipDetail}s...`);
      setTimeout(startDetailLoop, tspan)
    })
  } else {
    console.log(`[Detail]: Empty ip pool, restart in ${timespan.ipDetail}s...`);
    setTimeout(startDetailLoop, tspan)
  }
}


/**
 * 访问服务器
 */
const port = 3000;
const app = new koa();
const anonymous_level = ['未知', '高匿', '普匿', '透明'];
const succTitleSet = {
  host: 'IP地址',
  port: '端口',
  country: '国家',
  area: '地区',
  state: '省份',
  city: '城市',
  county: '乡镇',
  n0: '延迟ms',
  anonymous_level: '私密性',
  from: '源',
  isp: '服务商',
  lastverify_time: '源验证时间',
  download_time: '抓取时间',
  check_time: '验证时间',
};
const makeView = () => {
  let succTemplate = '';
  Object.keys(pool.succ).map((proxy, i) => {
    const each = pool.succ[proxy];
    let str = '<tr>';
    let strHeader = '<tr>';
    Object.keys(succTitleSet).map(key => {
      if (0 === i) {
        strHeader += `<th>${succTitleSet[key]}</th>`
      }
      const detail = pool.detail[each.host];
      let val = each[key]
      if (!val && detail) val = detail[key];
      switch (key) {
        case 'anonymous_level':
          val = anonymous_level[val];
          break;
        case 'lastverify_time':
        case 'download_time':
        case 'check_time':
          val = (new Date(val)).toLocaleString();
          break;
      }
      str += `<td>${val || ''}</td>`
    });
    str += '</tr>';
    strHeader += '</tr>';
    if (0 === i) succTemplate += strHeader;
    succTemplate += str;
  });
  return `
    <h3>代理IP列表</h3>
    <table border="1" cellspacing="0" width="100%">${succTemplate}</table>
  `;
}
app.use(async ctx => {
  ctx.body = makeView();
});
app.listen(3000);
console.log(`[Server]: Listen on port ${port}...`);


// main
// startAllCollectLoop()
// startCheckLoop()
// startDetailLoop()


class Demo {
  start() {
    startAllCollectLoop()
    startCheckLoop()
    startDetailLoop()
  }
}

module.exports = new Demo()
