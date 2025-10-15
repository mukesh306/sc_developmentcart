const mongoose = require("mongoose");

const SchoolergroupSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Schoolercategory",
      required: true,
    },
    seat: {
      type: Number,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin1",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Schoolergroup", SchoolergroupSchema);
