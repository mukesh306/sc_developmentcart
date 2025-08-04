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
  strickStatus: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
   createdAt: {
        type: Date,
        default: Date.now
    } ,
    scoreUpdatedAt: { type: Date },
  
},{ timestamps: true });
module.exports = mongoose.model('Topic', TopicSchema); 

 