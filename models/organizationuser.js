
const mongoose = require('mongoose');
const organizationuserSchema = new mongoose.Schema({
  firstName: { type: String },
  middleName: { type: String },
  lastName: { type: String},
  mobileNumber: { type: String,  unique: true },
  email: { type: String, required: true, unique: true },
  VerifyEmail: {
    type: String,
    default: 'no'
  },

  countryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  stateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  pincode: { type: String },
  studentType: { type: String, enum: ['school', 'college', 'institute'] }, 
  instituteName: { type: String },
  className: { type: mongoose.Schema.Types.ObjectId, ref: 'Adminschool' },
 
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin1' 
  },

  
  session: { type: String },
  startDate: { type: String },  
  endDate: { type: String },    
  endTime: { type: String },
   startDate: {
    type: String, 
  },
  endDate: {
    type: String, 
  },
   endTime: {
  type: String,
},

  aadharCard: { type: String },
  marksheet: { type: String },
  resetPasswordOTP: { type: String },

 status: {
    type: String,
    enum: ['no', 'yes'],
    default: 'no'
  },
//   updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin1' },
 createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'OrganizationSign' 
  },
  resetPasswordExpires: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Organizationuser', organizationuserSchema);