const mongoose = require('mongoose');

const CollegeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number,default:null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin1'},
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('College', CollegeSchema);
