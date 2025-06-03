
const moment = require('moment');
const mongoose = require('mongoose');
const Learning = require('../models/learning');
const Assigned = require('../models/assignlearning'); 
const LearningScore = require('../models/learningScore');
const MarkingSetting = require('../models/markingSetting');
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



exports.Practicestrike = async (req, res) => {
  try {
    const userId = req.user._id;

    const scores = await LearningScore.find({
      userId,
      strickStatus: true
    })
      .select('strickStatus scoreDate score') 
      .sort({ scoreDate: -1 });

    res.status(200).json({ scores });
  } catch (error) {
    console.error('Error in getStrictUserScores:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.Topicstrikes = async (req, res) => {
  try {
    const topics = await Topic.find({
      strickStatus: true,
      scoreUpdatedAt: { $exists: true }
    })
      .select('strickStatus scoreUpdatedAt score')
      .sort({ scoreUpdatedAt: -1 });

    if (!topics.length) {
      return res.status(404).json({ message: 'No strict topics found.' });
    }

    res.status(200).json({ topics });
  } catch (error) {
    console.error('Error in Topicstrikes:', error);
    res.status(500).json({ message: error.message });
  }
};



// exports.StrikeBothSameDate = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const scores = await LearningScore.find({
//       userId,
//       strickStatus: true
//     }).lean();
//     const topics = await Topic.find({
//       strickStatus: true,
//       scoreUpdatedAt: { $exists: true }
//     }).lean();

//     const scoreDates = new Set(
//       scores.map(s => moment(s.scoreDate).format('YYYY-MM-DD'))
//     );
//     const topicDates = new Set(
//       topics.map(t => moment(t.scoreUpdatedAt).format('YYYY-MM-DD'))
//     );

   
//     const commonDates = [...scoreDates].filter(date => topicDates.has(date));

    
//     const filteredScores = scores.filter(s =>
//       commonDates.includes(moment(s.scoreDate).format('YYYY-MM-DD'))
//     );
//     const filteredTopics = topics.filter(t =>
//       commonDates.includes(moment(t.scoreUpdatedAt).format('YYYY-MM-DD'))
//     );

//     res.status(200).json({
//       commonDates,
//       scores: filteredScores,
//       topics: filteredTopics
//     });
//   } catch (error) {
//     console.error('Error in StrikeBothSameDate:', error);
//     res.status(500).json({ message: error.message });
//   }
// };



exports.StrikeBothSameDate = async (req, res) => {
  try {
    const userId = req.user._id;

    const scores = await LearningScore.find({
      userId,
      strickStatus: true
    }).populate('learningId', 'name').lean();

    const topics = await Topic.find({
      strickStatus: true,
      scoreUpdatedAt: { $exists: true }
    }).populate('learningId', 'name').lean();

    const scoreDateMap = new Map();
    const topicDateMap = new Map();
    const allDatesSet = new Set();

    scores.forEach(score => {
      const date = moment(score.scoreDate).format('YYYY-MM-DD');
      allDatesSet.add(date);
      if (!scoreDateMap.has(date)) scoreDateMap.set(date, []);
      scoreDateMap.get(date).push({
        strickStatus: score.strickStatus,
        score: score.score,
        updatedAt:score.updatedAt,
        scoreDate:score.scoreDate,
        type: 'practice'
      });
    });

    topics.forEach(topic => {
      const date = moment(topic.scoreUpdatedAt).format('YYYY-MM-DD');
      allDatesSet.add(date);
      if (!topicDateMap.has(date)) topicDateMap.set(date, []);
      topicDateMap.get(date).push({
        strickStatus: topic.strickStatus,
        score: topic.score,
        updatedAt:topic.updatedAt,
        type: 'topic'
      });
    });

    const result = [];
    for (let date of allDatesSet) {
      const scoreItems = scoreDateMap.get(date) || [];
      const topicItems = topicDateMap.get(date) || [];
      const hasPractice = scoreItems.length > 0;
      const hasTopic = topicItems.length > 0;

      if (hasPractice && hasTopic) {
        const combined = [...scoreItems, ...topicItems];
        result.push({ date, data: combined });
      }
    }

    result.sort((a, b) => new Date(a.date) - new Date(b.date)); // sort oldest to newest

    // Check for streaks
    let maxStreak = 1;
    let currentStreak = 1;

    for (let i = 1; i < result.length; i++) {
      const prevDate = moment(result[i - 1].date);
      const currDate = moment(result[i].date);
      if (currDate.diff(prevDate, 'days') === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }


    const markingSetting = await MarkingSetting.findOne({}).sort({ updatedAt: -1 }).lean();

    const response = { dates: result };

    if (maxStreak >= 3 && markingSetting?.weeklyBonus) {
      response.weeklyBonus = markingSetting.weeklyBonus;
    }

    if (maxStreak >= 30 && markingSetting?.monthlyBonus) {
      response.monthlyBonus = markingSetting.monthlyBonus;
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error in StrikeBothSameDate:', error);
    res.status(500).json({ message: error.message });
  }
};




// exports.StrikeBothSameDate = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const scores = await LearningScore.find({
//       userId,
//       strickStatus: true
//     }).populate('learningId', 'name').lean();

//     const topics = await Topic.find({
//       strickStatus: true,
//       scoreUpdatedAt: { $exists: true }
//     }).populate('learningId', 'name').lean();

//     const scoreDateMap = new Map();
//     const topicDateMap = new Map();
//     const allDatesSet = new Set();
//     scores.forEach(score => {
//       const date = moment(score.scoreDate).format('YYYY-MM-DD');
//       allDatesSet.add(date);
//       if (!scoreDateMap.has(date)) scoreDateMap.set(date, []);
//       scoreDateMap.get(date).push({
//         strickStatus: score.strickStatus,
//         score: score.score,
//         type: 'practice'
//       });
//     });
//     topics.forEach(topic => {
//       const date = moment(topic.scoreUpdatedAt).format('YYYY-MM-DD');
//       allDatesSet.add(date);
//       if (!topicDateMap.has(date)) topicDateMap.set(date, []);
//       topicDateMap.get(date).push({
//         strickStatus: topic.strickStatus,
//         score: topic.score,
//         type: 'topic'
//       });
//     });

//     const result = [];
//     for (let date of allDatesSet) {
//       const scoreItems = scoreDateMap.get(date) || [];
//       const topicItems = topicDateMap.get(date) || [];
//       const hasPractice = scoreItems.length > 0;
//       const hasTopic = topicItems.length > 0;

//       if (hasPractice && hasTopic) {
//         const combined = [...scoreItems, ...topicItems];
//         result.push({ date, data: combined });
//       }
//     }

//     result.sort((a, b) => new Date(b.date) - new Date(a.date));

//     res.status(200).json({ dates: result });
//   } catch (error) {
//     console.error('Error in StrikeBothSameDate:', error);
//     res.status(500).json({ message: error.message });
//   }
// };
