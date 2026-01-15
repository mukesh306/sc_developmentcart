const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Schoolerexam",
      required: true
    },

    type: {
      type: String,
      enum: ["scheduled", "missedExam", "reminder","enrolled"],
      required: true
    },

    title: {
      type: String,
      required: true
    },

    message: {
      type: String,
      required: true
    },

    scheduleDate: String,
    scheduleTime: String,

    isRead: {
      type: Boolean,
      default: false
    },

       delayTime: { type: Number, default: 0 }, 
    nextTriggerAt: { type: Date, default: null },
    attemptCount: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    isCompleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", NotificationSchema);
