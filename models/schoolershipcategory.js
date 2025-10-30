const mongoose = require("mongoose");

const SchoolershipcategorySchema = new mongoose.Schema(

  {
    name: { type: String, required: true },
    price: { type: Number,required: true},
    groupSize: { type: Number,required: true},
    finalist: { type: Number,required: true},
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin1",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Schoolercategory", SchoolershipcategorySchema);
