const mongoose = require('mongoose');

const CollegeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('College', CollegeSchema);
