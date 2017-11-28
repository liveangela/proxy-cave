const database = require('../database');

const path = [
  'stats'
];
const config = path.map((each) => {
  const methodName = 'get' + each.replace(/^\S/, (s) => s.toUpperCase());
  return {
    path: '/' + each,
    getter: database[methodName],
  };
});

module.exports = config;
