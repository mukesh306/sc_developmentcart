const mongoose = require('mongoose');

const userHistorySchema = new mongoose.Schema({
  originalUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // user ka asli _id
  snapshot: { type: Object }, // pura user ka data
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('UserHistory', userHistorySchema);
