const mongoose = require('mongoose');

const LearningScoreSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
  learningId: { type: mongoose.Schema.Types.ObjectId, ref: 'Learnings', required: true },
  score: { type: Number },
  totalQuestions: { type: Number },
  answeredQuestions: { type: Number },
  correctAnswers: { type: Number },
  incorrectAnswers: { type: Number },
  skippedQuestions: { type: Number },
  marksObtained: { type: Number },
  totalMarks: { type: Number },
  negativeMarking: { type: Number },
  scorePercent: { type: Number },
 strickStatus: { type: Boolean, default: false },
 session: { type: String },
  createdAt: {
        type: Date,
        default: Date.now
    } ,
    scoreDate: { type: Date },
  
},{ timestamps: true });

module.exports = mongoose.model('LearningScore', LearningScoreSchema);
