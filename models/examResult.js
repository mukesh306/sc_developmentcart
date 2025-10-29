// models/ExamResult.js
const mongoose = require("mongoose");

const examResultSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  examId: { type: mongoose.Schema.Types.ObjectId, ref: "Schoolerexam", required: true },
  attemptId: { type: String, required: true },
  totalQuestions: { type: Number, required: true },
  correct: { type: Number, required: true },
  wrong: { type: Number, required: true },
  negativeMarks: { type: Number, required: true },
  finalScore: { type: Number, required: true },
  Completiontime: { type: Number},
  percentage: { type: Number, required: true },
  result: { type: String, enum: ["pass", "fail"], required: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ExamResult", examResultSchema);
