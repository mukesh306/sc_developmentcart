const mongoose = require('mongoose');

const AssignSchema = new mongoose.Schema({
    classId:  { type: mongoose.Schema.Types.ObjectId},
    learning:  { type: mongoose.Schema.Types.ObjectId, ref: 'Learnings' },
    learning2:  { type: mongoose.Schema.Types.ObjectId, ref: 'Learnings' },
    learning3:  { type: mongoose.Schema.Types.ObjectId, ref: 'Learnings' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    createdAt: {
        type: Date,
        default: Date.now
    }
});
module.exports = mongoose.model('Assigned', AssignSchema); 
