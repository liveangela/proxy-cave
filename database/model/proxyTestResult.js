const validationConfig = require('../../spider/config/validation');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const getVerifyHitCountNestedObject = () => {
  const res = {};
  Object.keys(validationConfig).map((key) => {
    res[key] = {
      type: Number,
      min: 0,
      default: 0,
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
  target: {
    type: String,
    require: true,
  },
  success_count: {
    type: Number,
    min: 0,
    default: 0,
  },
  fail_count: {
    type: Number,
    min: 0,
    default: 0,
  },
  verify_hit_count: getVerifyHitCountNestedObject(),
}, {
  timestamps: {
    createdAt: 'create_time',
    updatedAt: 'update_time',
  },
});

schema.virtual('rate').get(function () {
  const total = this.success_count + this.fail_count;
  return 0 === total ? 0 : this.success_count / total;
});

module.exports = mongoose.model('proxy_test_result', schema);

