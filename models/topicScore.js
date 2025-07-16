const mongoose = require('mongoose');

const topicScoreSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
  topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic' },
  learningId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Learnings' },
  score: { type: Number },
  totalQuestions: { type: Number },
  answeredQuestions: { type: Number },
  correctAnswers: { type: Number },
  incorrectAnswers: { type: Number },
  skippedQuestions: { type: Number },
  isdescription: { type: Boolean, default: false },
  strickStatus: { type: Boolean, default: false },
  isvideo: { type: Boolean, default: false },
  marksObtained: { type: Number },
  totalMarks: { type: Number },
  negativeMarking: { type: Number },
  scorePercent: { type: Number },
  session: { type: String },
  classId: { type: String },
   startDate: {
    type: String, 
  },
  endDate: {
    type: String, 
  },
 strickStatus: { type: Boolean, default: false },
  createdAt: {
        type: Date,
        default: Date.now
    } ,
    scoreDate: { type: Date },
},{ timestamps: true });

module.exports = mongoose.model('topicScore', topicScoreSchema);
