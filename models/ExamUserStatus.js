const mongoose = require("mongoose");

const ExamUserStatusSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: "Schoolerexam", required: true },

    category: {
      _id: mongoose.Schema.Types.ObjectId,
      name: String,
      finalist: Boolean,
    },

    className: {
      _id: mongoose.Schema.Types.ObjectId,
      name: String,
    },
attemptStatus: {
  type: String,
  enum: ["Attempted", "Not Attempted"],

},

    totalQuestions: Number,
    correct: Number,
    finalScore: Number,
    percentage: Number,
    rank: Number,
    totalParticipants: Number,
    result: String, 
    statusManage: String, 
    status: Boolean,
    publish: Boolean,
    attend: Boolean,
    visible: Boolean,
    isEligible: Boolean,

    ScheduleDate: String,
    ScheduleTime: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("ExamUserStatus", ExamUserStatusSchema);
