const mongoose = require('mongoose');

const TopicSchema = new mongoose.Schema({
    classId:  { type: mongoose.Schema.Types.ObjectId},
    learningId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Learnings' },
   topic:{ type: String, required: true },
   description:{ type: String, required: true },
   image:{ type: String, required: true },
   video:{ type: String, required: true },
   score: { type: String, default: null },
totalQuestions: { type: Number, default: null },
correctAnswers: { type: Number, default: null },
incorrectAnswers: { type: Number, default: null },

        isdescription: { type: String, default: "false" },
  isvideo: { type: String, default: "false" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
   createdAt: {
        type: Date,
        default: Date.now
    } 
});
module.exports = mongoose.model('Topic', TopicSchema); 
