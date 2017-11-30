const validationConfig = require('../../spider/config/validation');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const getProxyVerifyResultNestedObject = () => {
  const res = {};
  Object.keys(validationConfig).map((key) => {
    res[key] = {
      verify_result: {
        type: Boolean,
        require: true,
      },
      verify_time: {
        type: Date,
      },
      delay: {
        type: Number,
        min: 0,
      },
      // 0-Transparent, 1-Anonymous, 2-Distorting, 3-High Anonymity, 4-Unknown
      anonymous_level: {
        type: Number,
        min: 0,
        max: 4,
      },
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
  result_list: getProxyVerifyResultNestedObject(),
}, {
  timestamps: {
    createdAt: 'create_time',
    updatedAt: 'update_time',
  },
});

schema.virtual('success_count').get(function () {
  let count = 0;
  Object.keys(validationConfig).map((key) => {
    const each = this.result_list[key];
    if (each && each.verify_result) count += 1;
  });
  return count;
});

schema.virtual('anonymity').get(function () {
  let min = 0;
  Object.keys(validationConfig).map((key) => {
    const each = this.result_list[key];
    if (each && each.anonymous_level) min = Math.min(min, each.anonymous_level);
  });
  return min;
});

module.exports = mongoose.model('proxy_verify_result', schema);

