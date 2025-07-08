const mongoose = require('mongoose');

const userQuizAnswerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic', required: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  selectedAnswer: { type: String, required: true },
  strickStatus: { type: Boolean, default: false },
   session: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('UserQuizAnswer', userQuizAnswerSchema);
