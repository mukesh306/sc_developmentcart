const mongoose = require('mongoose');

const userHistorySchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Reference to User
  originalUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  clonedAt: { type: Date, default: Date.now },

  // Copy of all fields from User
  firstName: { type: String, required: true },
  middleName: { type: String },
  lastName: { type: String, required: true },
  mobileNumber: { type: String },
  email: { type: String },
  VerifyEmail: { type: String, default: 'no' },
  password: { type: String },
  countryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  stateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  pincode: { type: String },
  studentType: { type: String, enum: ['school', 'college', 'institute'] },
  instituteName: { type: String },
  className: { type: mongoose.Schema.Types.ObjectId, ref: 'Adminschool' },
  session: { type: String },
  startDate: { type: String },
  endDate: { type: String },
  endTime: { type: String },
  platformDetails: { type: String },
  aadharCard: { type: String },
  marksheet: { type: String },
  resetPasswordOTP: { type: String },
  bonuspoint: { type: Number, default: 0 },
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
  level: { type: Number, default: 1 },
  status: { type: String, enum: ['no', 'yes'], default: 'no' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin1' },
  resetPasswordExpires: { type: Date },
  createdAt: { type: Date, default: Date.now }
}, {
  _id: false // Default _id disable किया ताकि हम manually _id set कर सकें
});

// अगर originalUserId + clonedAt को unique रखना है (duplicate avoid करने के लिए)
userHistorySchema.index({ originalUserId: 1, clonedAt: 1 }, { unique: true });

module.exports = mongoose.model('UserHistory', userHistorySchema);
