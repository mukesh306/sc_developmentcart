const mongoose = require('mongoose');

const LearningSchema = new mongoose.Schema({
    name: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    
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
createdAt: {
        type: Date,
        default: Date.now
    } ,
    scoreUpdatedAt: { type: Date },
  
},{ timestamps: true });
module.exports = mongoose.model('Learnings', LearningSchema); 
