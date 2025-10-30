const mongoose = require("mongoose");

const topicQuestionSchema = new mongoose.Schema({
  question: { type: String, default: "" },

  option1: { type: String, default: "" },
  option2: { type: String, default: "" },
  option3: { type: String, default: "" },
  option4: { type: String, default: "" },
  answer: { type: String, default: "" },
});

const SchoolerExamSchema = new mongoose.Schema(
  {
    examName: { type: String, required: true, trim: true },
    
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Schoolercategory",
      required: true,
    },
    className: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Adminschool",
      required: true,
    },
    ScheduleDate: { type: String, required: true },
    ScheduleTime: { type: String, required: true },
    ExamTime: { type: String, required: true },
    Negativemark: { type: String, default: "0" },
    passout: { type: String, default: "0" },
    seat: { type: Number, required: true, min: 1 },
    publish:{ type: Boolean,default: false},
    topicQuestions: [topicQuestionSchema],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin1",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Schoolerexam", SchoolerExamSchema);
