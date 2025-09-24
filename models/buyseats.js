const mongoose = require("mongoose");

const BuySchema = new mongoose.Schema(
  {
    classSeatId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "ClassSeat", 
      required: true 
    },
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "OrganizationSign", 
      required: true 
    },
    
    seat: { type: Number, required: true },
    price: { type: Number, required: true },
    totalPrice: { type: Number, required: true },

    amountPaid: { type: Number, default: 0 }, // ✅ user ne jo pay kiya
    paymentStatus: { type: Boolean, default: false }, // ✅ paid ya nahi

    grandTotal: { type: Number, default: 0 } // ✅ agar grand total pass karna hai
  },
  { timestamps: true }
);

module.exports = mongoose.model("BuySeat", BuySchema);
