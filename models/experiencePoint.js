const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  perLevel: { type: Number }, 
  maxExpDaily: { type: String },
  allotmentFormula: { type: Number }, 
  deductions: { type: Number },                        
  eachQuestion: { type: Number },                       
  negativeMarking: { type: String }, 
  streak7Days: { type: Number },                       
  streak30Days: { type: Number }                     
}, { timestamps: true });

module.exports = mongoose.model('Experience', SettingsSchema);
