const mongoose = require('mongoose');

const PracticesQuizAnswerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
  learningId: { type: mongoose.Schema.Types.ObjectId, ref: 'Learnings' },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  selectedAnswer: { type: String,  },
  strickStatus: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('PracticesQuizAnswer', PracticesQuizAnswerSchema);
