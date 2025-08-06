// models/GenralIQ.js
const mongoose = require("mongoose");

const GenralIQSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    learningId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Learning",
      required: true,
    },
    overallAverage: {
      type: Number,
      required: true,
    },
     startDate: {
    type: String, 
  },
  endDate: {
    type: String, 
  },
   endTime: {
  type: String,
},
    session:{type:String},
    classId:{type:String},
  },
  { timestamps: true }
);

module.exports = mongoose.model("GenralIQ", GenralIQSchema);
