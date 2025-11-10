const mongoose = require('mongoose');
const userexamGroupSchema = new mongoose.Schema({
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  category:{ type: mongoose.Schema.Types.ObjectId, ref: "Schoolercategory" },
 className: { type: mongoose.Schema.Types.ObjectId, ref: 'Adminschool' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("userexamGroup", userexamGroupSchema);
