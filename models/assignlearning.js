const mongoose = require('mongoose');

const AssignSchema = new mongoose.Schema({
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },

  learning: { type: mongoose.Schema.Types.ObjectId, ref: 'Learnings' },
  learningAverage: { type: Number, default: null },

  learning2: { type: mongoose.Schema.Types.ObjectId, ref: 'Learnings' },
  learning2Average: { type: Number, default: null },

  learning3: { type: mongoose.Schema.Types.ObjectId, ref: 'Learnings' },
  learning3Average: { type: Number, default: null },

  learning4: { type: mongoose.Schema.Types.ObjectId, ref: 'Learnings' },
  learning4Average: { type: Number, default: null },
session: {
    type: String
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Assigned', AssignSchema);
