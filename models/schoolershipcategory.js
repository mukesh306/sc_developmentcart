const mongoose = require("mongoose");

const SchoolershipcategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number},
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin1",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Schoolercategory", SchoolershipcategorySchema);
