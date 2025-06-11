// models/MarkingSettingModel.js
const mongoose = require('mongoose');
const MarkingSettingSchema = new mongoose.Schema({
  maxMarkPerQuestion: {
    type: Number
  
  },
  maxdailyexperience: {
    type: Number
  
  },
  negativeMarking: {
    type: Number
  },
  totalquiz: {
    type: Number
  },
  totalnoofquestion: {
    type: Number
  },
  weeklyBonus: {
    type: Number
  },
  monthlyBonus: {
    type: Number
  },
  experiencePoint: {
    type: Number
  },
  dailyExperience: {
    type: Number
  },

  deductions: {
    type: Number
  },

  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
}, { timestamps: true });

module.exports = mongoose.model('MarkingSetting', MarkingSettingSchema);
