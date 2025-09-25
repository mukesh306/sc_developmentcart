const mongoose = require('mongoose');

const organizationuserSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  middleName: { type: String },
  lastName: { type: String, required: true },
  mobileNumber: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  countryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Country' },
  stateId: { type: mongoose.Schema.Types.ObjectId, ref: 'State' },
  cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City' },
  pincode: { type: String },
  studentType: { type: String },
  schoolName: { type: String },
  instituteName: { type: String },
  collegeName: { type: String },
  className: { type: mongoose.Schema.Types.ObjectId, refPath: 'classModel' },
  classModel: { type: String, enum: ['School', 'College', 'Institute'] },
  aadharCard: { type: String },
  marksheet: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('OrganizationUser', organizationuserSchema);
