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
        default: Date.now,
      },
      delay: {
        type: Number,
        min: 0,
        default: 0,
      },
      anonymous_level: {
        type: Number,
        min: 0,
        max: 4,
        default: 4,
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
  result: getProxyVerifyResultNestedObject(),
}, {
  timestamps: {
    createdAt: 'create_time',
    updatedAt: 'update_time',
  },
});

module.exports = mongoose.model('proxy_verify_result', schema);

