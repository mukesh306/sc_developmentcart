const mongoose = require('mongoose');

const TopicSchema = new mongoose.Schema({
classId:  { type: mongoose.Schema.Types.ObjectId},
learningId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Learnings' },
topic:{ type: String, required: true },
description:{ type: String, required: true },
image:{ type: String, required: true },
video:{ type: String, required: true },
videoTime:{ type: String},
testTime:{ type: String},
testTimeInSeconds:{ type: Number, default: 0 },

score: { type: String, default: null },
totalQuestions: { type: Number, default: null },
answeredQuestions: { type: Number, default: null },
correctAnswers: { type: Number, default: null },
incorrectAnswers: { type: Number, default: null },
skippedQuestions: { type: Number, default: null },
marksObtained: { type: Number, default: null },
totalMarks: { type: Number, default: null },
negativeMarking: { type: Number, default: null },
scorePercent: { type: Number, default: null },


isdescription: { type: Boolean, default: false },
isvideo: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
   createdAt: {
        type: Date,
        default: Date.now
    } ,
    scoreUpdatedAt: { type: Date },
  
},{ timestamps: true });
module.exports = mongoose.model('Topic', TopicSchema); 

 