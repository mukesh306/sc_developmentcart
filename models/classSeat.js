const mongoose = require("mongoose");

const ClassSeatSchema = new mongoose.Schema(
  {
    className:
     { type: String, required: true },
      
    seat: { 
      type: Number,  
      required: true 
    },
    createdBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "OrganizationSign", 
      required: true 
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ClassSeat", ClassSeatSchema);
