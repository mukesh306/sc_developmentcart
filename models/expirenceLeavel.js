// models/GenralIQ.js
const mongoose = require("mongoose");

const ExperienceleavelSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
   
    levelBonusPoint: {
      type: Number,
     
    },
    session:{type:String},
    classId:{type:String},
  },
  { timestamps: true }
);

module.exports = mongoose.model("Experienceleavel", ExperienceleavelSchema);
