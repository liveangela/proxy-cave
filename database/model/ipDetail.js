const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
  ip: {
    type: String,
    required: true,
    unique: true,
    index: true,
    match: /\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}/,
  },
  country: String,
  area: String,
  region: String,
  city: String,
  county: String,
  isp: String,
  country_id: String,
  area_id: String,
  region_id: String,
  city_id: String,
  county_id: String,
  isp_id: String,
}, {
  timestamps: {
    createdAt: 'create_time',
    updatedAt: 'update_time',
  },
});

module.exports = mongoose.model('ip_detail', schema);
