const mongoose = require('mongoose');

const AdminSchool = new mongoose.Schema({
  schoolId: {
    type: mongoose.Schema.Types.ObjectId,
     ref: 'School',
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin1',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Adminschool', AdminSchool);
