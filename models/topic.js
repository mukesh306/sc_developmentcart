const mongoose = require('mongoose');

const TopicSchema = new mongoose.Schema({
    classId:  { type: mongoose.Schema.Types.ObjectId},
    learningId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Learnings' },
   topic:{ type: String, required: true },
   description:{ type: String, required: true },
   image:{ type: String, required: true },
   video:{ type: String, required: true },
  score: { type: Number, default: "0" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    createdAt: {
        type: Date,
        default: Date.now
    }
});
module.exports = mongoose.model('Topic', TopicSchema); 
