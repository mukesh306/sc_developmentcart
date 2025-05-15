const Learning = require('../models/learning');
const Assigned = require('../models/assignlearning'); 

exports.createLearning = async (req, res) => {
  try {
    const { name} = req.body;
    const newLearn = new Learning({ name,createdBy: req.user._id });
    await newLearn.save();
    res.status(201).json({ message: 'Learning  created successfully.', data: newLearn });
  } catch (error) {
    res.status(500).json({ message: 'Error creating Learning.', error: error.message });
  }
};
exports.getLearning = async (req, res) => {
  try {
    const learning = await Learning.find().populate('createdBy', 'email');
    res.status(200).json({ message: 'Learning fetched successfully.', data: learning });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching Learning.', error: error.message });
  }
};


// exports.updateQuote = async (req, res) => {
//   try {
//     const quoteId = req.params.id;
//     const updated = await Quotes.findByIdAndUpdate(quoteId, req.body, { new: true });
//     if (!updated) return res.status(404).json({ message: 'Quote not found.' });

//     res.status(200).json({ message: 'Quote updated successfully.', data: updated });
//   } catch (error) {
//     res.status(500).json({ message: 'Error updating quote.', error: error.message });
//   }
// };



exports.deleteLearning = async (req, res) => {
  try {
    const learningId = req.params.id;

    // Check if the Learning ID is referenced in Assigned schema
    const isAssigned = await Assigned.findOne({ assign: learningId });

    if (isAssigned) {
      return res.status(400).json({
        message: 'Cannot delete. This Learning is currently assigned.'
      });
    }

    // If not assigned, proceed to delete
    const deleted = await Learning.findByIdAndDelete(learningId);

    if (!deleted) {
      return res.status(404).json({ message: 'Learning not found.' });
    }

    res.status(200).json({ message: 'Learning deleted successfully.' });

  } catch (error) {
    console.error('Delete Learning Error:', error);
    res.status(500).json({ message: 'Error deleting Learning.', error: error.message });
  }
};
