const validationConfig = require('../spider/config/validation');
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
        type: Number,
        require: true,
        min: 1,
      },
      delay: {
        type: Number,
        min: 0,
        default: 0,
        set(v) {
          return parseInt(v, 10);
        }
      },
      anonymous_level: {
        type: Number,
        min: 0,
        max: 4,
        default: 4,
      },
    };
  });
};

const schema = new Schema({
  proxy_id: {
    type: Schema.Types.ObjectId,
    index: true,
  },
  result: getProxyVerifyResultNestedObject(),
});

module.exports = mongoose.model('ProxyVerifyResultModel', schema);

