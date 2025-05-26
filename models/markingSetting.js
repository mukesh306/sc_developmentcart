// models/MarkingSettingModel.js
const mongoose = require('mongoose');

const MarkingSettingSchema = new mongoose.Schema({
  maxMarkPerQuestion: {
    type: Number,
    required: true
  },
  negativeMarking: {
    type: Number,
    required: true
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
}, { timestamps: true });

module.exports = mongoose.model('MarkingSetting', MarkingSettingSchema);
