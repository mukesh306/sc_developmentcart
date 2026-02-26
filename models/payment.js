const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Razorpay Order ID
    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },

    // Razorpay Payment ID
    razorpayPaymentId: {
      type: String,
      default: null,
    },

    amount: {
      type: Number,
      required: true,
    },

    displayAmount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "INR",
    },

    paymentMethod: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["CREATED", "COMPLETED", "FAILED"],
      default: "CREATED",
    },

    rawResponse: {
      type: Object,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);