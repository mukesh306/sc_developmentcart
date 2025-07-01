const Quotes = require('../models/quotes');

exports.createQuote = async (req, res) => {
  try {
    const { quotes, by,Status} = req.body;
    const newQuote = new Quotes({ quotes, by, Status,createdBy: req.user._id });
    await newQuote.save();
    res.status(201).json({ message: 'Quote created successfully.', data: newQuote });
  } catch (error) {
    res.status(500).json({ message: 'Error creating quote.', error: error.message });
  }
};

exports.getQuotes = async (req, res) => {
  try {
    const statusFilter = req.query.Status ? { Status: req.query.Status } : {};
    const quotes = await Quotes.find(statusFilter).populate('createdBy', 'email');
    res.status(200).json({ message: 'Quotes fetched successfully.', data: quotes });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching quotes.', error: error.message });
  }
};


exports.getPublishedQuotes = async (req, res) => {
  try {
    const quotes = await Quotes.find({ Status: 'Published' }).populate('createdBy', 'email');
    res.status(200).json({ message: 'Published quotes fetched successfully.', data: quotes });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching published quotes.', error: error.message });
  }
};



exports.updateQuote = async (req, res) => {
  try {
    const quoteId = req.params.id;
    const updated = await Quotes.findByIdAndUpdate(quoteId, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Quote not found.' });

    res.status(200).json({ message: 'Quote updated successfully.', data: updated });
  } catch (error) {
    res.status(500).json({ message: 'Error updating quote.', error: error.message });
  }
};

exports.StatusUpdateQuote = async (req, res) => {
  try {
    const quoteId = req.params.id;
    const Status = "Published";
    const existingPublicQuote = await Quotes.findOne({
      Status: "Published",
      _id: { $ne: quoteId },
    });

    if (existingPublicQuote) {
      await Quotes.findByIdAndUpdate(existingPublicQuote._id, { Status: "Used" });
    }
    const updated = await Quotes.findByIdAndUpdate(
      quoteId,
      { Status },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Quote not found.' });
    }

    res.status(200).json({
      message: 'Quote status updated to "Published" successfully.',
      data: updated,
    });

  } catch (error) {
    res.status(500).json({
      message: 'Error updating quote status.',
      error: error.message,
    });
  }
};


exports.deleteQuote = async (req, res) => {
  try {
    const quoteId = req.params.id;
    const deleted = await Quotes.findByIdAndDelete(quoteId);
    if (!deleted) return res.status(404).json({ message: 'Quote not found.' });

    res.status(200).json({ message: 'Quote deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting quote.', error: error.message });
  }
};