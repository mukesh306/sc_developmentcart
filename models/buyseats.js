const mongoose = require("mongoose");

const BuySchema = new mongoose.Schema(
  {
    classSeatId: { type: String, required: true },
     
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "OrganizationSign", 
      required: true 
    },
    
    seat: { type: Number, required: true },
    price: { type: Number, required: true },
    totalPrice: { type: Number, required: true },

    amountPaid: { type: Number, default: 0 }, 
    paymentStatus: { type: Boolean, default: false }, 

    grandTotal: { type: Number, default: 0 } 
  },
  { timestamps: true }
);

module.exports = mongoose.model("BuySeat", BuySchema);
