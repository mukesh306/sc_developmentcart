const mongoose = require('mongoose');

const SimpleInstitutionSchema = new mongoose.Schema({
  instuteId: {
    type: mongoose.Schema.Types.ObjectId,
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

module.exports = mongoose.model('AdminInstitution', SimpleInstitutionSchema);
