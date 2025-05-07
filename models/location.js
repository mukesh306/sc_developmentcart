// models/location.js
const mongoose = require('mongoose');

const LocationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['country', 'state', 'city'], required: true },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', default: null }, 
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Location', LocationSchema);
