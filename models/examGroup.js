
const mongoose = require('mongoose');
const examGroupSchema = new mongoose.Schema({
  examId: { type: mongoose.Schema.Types.ObjectId, ref: "Schoolerexam", required: true },
  groupNumber: { type: Number, required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ExamGroup", examGroupSchema);
