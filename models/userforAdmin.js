const mongoose = require("mongoose");

const userForAdminSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },

    // Store full user response
    responseData: { type: Object, default: {} },

    // Exam summary fields
    result: { type: String, default: "null" }, 
    status: { type: Boolean, default: false },           
    attend: { type: Boolean, default: false },
    visible: { type: Boolean, default: true },
    isEligible: { type: Boolean, default: false },
    finalScore: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserForAdmin", userForAdminSchema);
