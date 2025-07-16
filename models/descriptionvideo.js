const mongoose = require('mongoose');


const descriptionvideoSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Users', required: true },
  topicId: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic' },
  learningId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Learnings' },
  isdescription: { type: Boolean, default: false },
  isvideo: { type: Boolean, default: false },
  session:{type:String},
    startDate: {
    type: String, 
  },
  endDate: {
    type: String, 
  },
  createdAt: {
        type: Date,
        default: Date.now
    } ,
    scoreDate: { type: Date },
},{ timestamps: true });

module.exports = mongoose.model('descriptionvideo', descriptionvideoSchema);
