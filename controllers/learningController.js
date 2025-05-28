
const moment = require('moment');
const mongoose = require('mongoose');
const Learning = require('../models/learning');
const Assigned = require('../models/assignlearning'); 

const Topic = require('../models/topic');
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

exports.deleteLearning = async (req, res) => {
  try {
    const learningId = req.params.id;

    const isAssigned = await Assigned.findOne({ assign: learningId });

    if (isAssigned) {
      return res.status(400).json({
        message: 'Cannot delete. This Learning is currently assigned.'
      });
    }

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

exports.updateLearning = async (req, res) => {
  try {
    const learningId = req.params.id;
    const updateData = req.body;

    const isAssigned = await Assigned.findOne({
      $or: [
        { learning: learningId },
        { learning2: learningId },
        { learning3: learningId }
      ]
    });

    if (isAssigned) {
      return res.status(400).json({
        message: 'Cannot update. This Learning is currently assigned.'
      });
    }

    const updatedLearning = await Learning.findByIdAndUpdate(
      learningId,
      updateData,
      { new: true }
    );

    if (!updatedLearning) {
      return res.status(404).json({ message: 'Learning not found.' });
    }

    res.status(200).json({
      message: 'Learning updated successfully.',
      data: updatedLearning
    });
  } catch (error) {
    console.error('Update Learning Error:', error);
    res.status(500).json({ message: 'Error updating Learning.', error: error.message });
  }
};

exports.scoreCard = async (req, res) => {
  try {
    const user = req.user;

    if (!user || !user.className) {
      return res.status(400).json({ message: 'User class is missing.' });
    }

    const classId = new mongoose.Types.ObjectId(user.className);

    const topics = await Topic.find({
      classId,
      score: { $ne: null },
      scoreUpdatedAt: { $exists: true }
    })
      .sort({ scoreUpdatedAt: 1 }) 
      .select('topic scoreUpdatedAt learningId score')
      .populate('learningId')
      .lean();

    if (!topics.length) {
      return res.status(404).json({ message: 'No scored topics found for this class.' });
    }

    const firstScoredTopicsPerDay = [];
    const seenDates = new Set();

    for (const topic of topics) {
      const dateKey = moment(topic.scoreUpdatedAt).format('YYYY-MM-DD');
      if (!seenDates.has(dateKey)) {
        seenDates.add(dateKey);
        firstScoredTopicsPerDay.push(topic);
      }
    }

    res.status(200).json({
      message: 'First scored topic per day fetched successfully.',
      topics: firstScoredTopicsPerDay
    });

  } catch (error) {
    console.error('Error fetching first scored topic per day:', error);
    res.status(500).json({ message: error.message });
  }
};

