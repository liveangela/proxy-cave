const resourceConfig = require('../spider/config/resource');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const getProxyOriginCreateTimeNestedObject = () => {
  const res = {};
  Object.keys(resourceConfig).map((key) => {
    res[key] = {
      type: Number,
      require: true,
      min: 1,
    };
  });
  return res;
};

const schema = new Schema({
  proxy: {
    type: String,
    required: true,
    unique: true,
    index: true,
    match(v) {
      return v.match(/\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}:\d{1,4}/);
    }
  },
  host: {
    type: String,
    required: true,
    match(v) {
      return v.match(/\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}/);
    }
  },
  port: {
    type: String,
    required: true,
    set(v) {
      return ('' + v).trim();
    },
  },
  create_time: getProxyOriginCreateTimeNestedObject(),
  lastverify_time: {
    type: Number,
    min: 0,
    default: 0,
  },
});

module.exports = mongoose.model('ProxyOriginModel', schema);
