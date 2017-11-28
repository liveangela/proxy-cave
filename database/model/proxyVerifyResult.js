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

module.exports = mongoose.model('proxy_verify_result', schema);

