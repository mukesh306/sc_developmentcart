const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin'],
    default: 'admin'
  },
  session: {
    type: String,
    default: ''
  },
  startDate: {
    type: String,
    default: ''
  },
  endDate: {
    type: String,
    default: ''
  },
  status: {
    type: Boolean,
    default: true
  },
  endTime: {
  type: String,
},
  otp: {
    type: String
  },
  otpExpires: {
    type: Date
  },
   createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin', 
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Admin1', AdminSchema);
