const mongoose = require('mongoose');

const OrganizationSignSchema = new mongoose.Schema({
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
  studentType: { type: String, enum: ['school', 'college', 'institute'] }, 
  instituteName: { type: String },
  session: { type: String },
  otp: { type: String },
  otpExpires: { type: Date },

  // 🔹 OTP history (track used/expired OTPs)
  otpHistory: [
    {
      otp: { type: String },
      status: { type: String, enum: ["used", "expired"], default: "used" },
      createdAt: { type: Date, default: Date.now }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('OrganizationSign', OrganizationSignSchema);
