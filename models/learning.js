const mongoose = require('mongoose');

const LearningSchema = new mongoose.Schema({
    name: { type: String, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
createdAt: {
        type: Date,
        default: Date.now
    } ,
    scoreUpdatedAt: { type: Date },
  
},{ timestamps: true });
module.exports = mongoose.model('Learnings', LearningSchema); 
