const mongoose = require('mongoose');

const QuoteSchema = new mongoose.Schema({
    quotes: { type: String, required: true },
    by: { type: String, required: true }, 
     Status: {
  type: String,
  default: "Publish",
},
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Quotes', QuoteSchema); 
