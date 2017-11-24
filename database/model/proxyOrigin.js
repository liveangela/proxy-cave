const resourceConfig = require('../../spider/config/resource');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const getProxyOriginCreateTimeNestedObject = () => {
  const res = {};
  Object.keys(resourceConfig).map((key) => {
    res[key] = {
      type: Date,
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
    match: /\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}:\d{1,4}/,
  },
  host: {
    type: String,
    required: true,
    match: /\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}/,
  },
  port: {
    type: String,
    required: true,
    trim: true,
  },
  ip_detail: {
    country: String,
    area: String,
    region: String,
    city: String,
    county: String,
    isp: String,
  },
  create_time: getProxyOriginCreateTimeNestedObject(),
  lastverify_time: {
    type: Date,
    default: 0,
  },
});

module.exports = mongoose.model('proxy_origin', schema);
