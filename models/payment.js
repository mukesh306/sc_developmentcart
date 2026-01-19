const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  merchantOrderId: { type: String, unique: true },
  amount: Number,
  status: String,
  rawResponse: Object
}, { timestamps: true });

module.exports = mongoose.model("Payment", paymentSchema);
