const mongoose = require('mongoose');
const userexamGroupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  category:{ type: mongoose.Schema.Types.ObjectId, ref: "Schoolercategory" },
 className: { type: mongoose.Schema.Types.ObjectId, ref: 'Adminschool' },
 createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin1' },
  createdAt: { type: Date, default: Date.now },
});
userexamGroupSchema.index({ category: 1, name: 1 }, { unique: true })
module.exports = mongoose.model("userexamGroup", userexamGroupSchema);
