
const mongoose = require('mongoose');
const examAnswerSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  examId: { type: mongoose.Schema.Types.ObjectId, ref: "Schoolerexam", required: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, required: true },
  selectedAnswer: { type: String },
  attemptId: { type: String, required: true },
});

module.exports = mongoose.model("ExamAnswer", examAnswerSchema);
