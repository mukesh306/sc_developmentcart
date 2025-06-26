const mongoose = require('mongoose');

const QuizSchema = new mongoose.Schema({
    topicId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Topic' },
   question:{ type: String, required: true },
   option1:{ type: String, required: true },
   option2:{ type: String, required: true },
   option3:{ type: String, required: true },
   option4:{ type: String, required: true },
   answer:{ type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    createdAt: {
        type: Date,
        default: Date.now
    }
});
module.exports = mongoose.model('Quiz', QuizSchema); 
