// models/Meta.js
const mongoose = require('mongoose');

const MetaSchema = new mongoose.Schema({
  key: { type: String, unique: true, index: true },
  value: { type: String },   // we'll store the Karachi date as 'YYYY-MM-DD'
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Meta', MetaSchema);
