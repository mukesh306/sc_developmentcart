
const mongoose = require('mongoose');
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  middleName: { type: String },
  lastName: { type: String, required: true },
  mobileNumber: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  VerifyEmail: {
    type: String,
    default: 'no'
  },
  password: { type: String, required: true },
  countryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  stateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  pincode: { type: String },
  studentType: { type: String, enum: ['school', 'college', 'institute'] }, 
  instituteName: { type: String },
  className: { type: mongoose.Schema.Types.ObjectId, ref: 'Adminschool' },
  aadharCard: { type: String },
  marksheet: { type: String },
  resetPasswordOTP: { type: String },
  bonuspoint: { type: Number ,default: 0 },
 bonusDates: [String],
 deductedDates: [String],
 weeklyBonusDates: [String],
 monthlyBonusDates: [String],
 userLevelData: [
  {
    level: Number,
    levelBonusPoint: { type: Number, default: 0 },
    data: [
      {
        date: String,
        data: Array,
        dailyExperience: Number,
        weeklyBonus: Number,
        monthlyBonus: Number,
        deduction: Number
      }
    ]
  }
],


 level: {
  type: Number,
  default: 1
},
 status: {
    type: String,
    enum: ['no', 'yes'],
    default: 'no'
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin1' },
  resetPasswordExpires: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);