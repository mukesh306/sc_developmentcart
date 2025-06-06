
const moment = require('moment');
const mongoose = require('mongoose');
const Learning = require('../models/learning');
const Assigned = require('../models/assignlearning'); 
const LearningScore = require('../models/learningScore');
const MarkingSetting = require('../models/markingSetting');
const Topic = require('../models/topic');
const TopicScore = require('../models/topicScore');


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
    const userId = req.user._id;
    // Step 1: Get scores sorted by earliest scoreDate and group by date
    const rawScores = await TopicScore.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $sort: { scoreDate: 1 } }, // earliest first
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$scoreDate" }
          },
          doc: { $first: "$$ROOT" } // get first score per day
        }
      },
      {
        $replaceRoot: { newRoot: "$doc" }
      },
      { $sort: { scoreDate: -1 } } // optional: latest dates on top
    ]);
    // Step 2: Populate topicId and learningId manually
    const populatedScores = await TopicScore.populate(rawScores, [
      { path: 'topicId', select: 'topic' },
      { path: 'learningId', select: 'name' }
    ]);

    // Step 3: Return response
    res.status(200).json({ scores: populatedScores });
  } catch (error) {
    console.error('Error in scoreCard:', error);
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


exports.StrikeBothSameDate = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type = '', startDate, endDate } = req.query;
    const typeArray = Array.isArray(type) ? type : type.split(',');

    const start = startDate ? moment(startDate, 'DD-MM-YYYY').startOf('day') : null;
    const end = endDate ? moment(endDate, 'DD-MM-YYYY').endOf('day') : null;

    // --- PRACTICE SCORE QUERY ---
    const scoreQuery = { userId, strickStatus: true };
    if (start && end) {
      scoreQuery.scoreDate = { $gte: start.toDate(), $lte: end.toDate() };
    }

    // --- TOPIC SCORE QUERY ---
    const topicScoreQuery = { userId, strickStatus: true };
    if (start && end) {
      topicScoreQuery.updatedAt = { $gte: start.toDate(), $lte: end.toDate() };
    }

    const scores = await LearningScore.find(scoreQuery)
      .populate('learningId', 'name')
      .lean();
    const topicScores = await TopicScore.find(topicScoreQuery)
      .populate('learningId', 'name')
      .lean();

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
        updatedAt: score.updatedAt,
        scoreDate: score.scoreDate,
        type: 'practice',
        learningId: score.learningId
      });
    });

    topicScores.forEach(score => {
      const date = moment(score.updatedAt).format('YYYY-MM-DD');
      allDatesSet.add(date);
      if (!topicDateMap.has(date)) topicDateMap.set(date, []);
      topicDateMap.get(date).push({
        strickStatus: score.strickStatus,
        score: score.score,
        updatedAt: score.updatedAt,
        type: 'topic',
        learningId: score.learningId
      });
    });

    const result = [];
    for (let date of allDatesSet) {
      const scoreItems = scoreDateMap.get(date) || [];
      const topicItems = topicDateMap.get(date) || [];

      if (typeArray.includes('topic') && typeArray.includes('practice')) {
        if (scoreItems.length > 0 && topicItems.length > 0) {
          result.push({ date });
        }
      } else if (typeArray.length === 1 && typeArray.includes('practice')) {
        if (scoreItems.length > 0) {
          result.push({ date, data: scoreItems });
        }
      } else if (typeArray.length === 1 && typeArray.includes('topic')) {
        if (topicItems.length > 0) {
          result.push({ date, data: topicItems });
        }
      }
    }

    result.sort((a, b) => new Date(a.date) - new Date(b.date));

    const bothTypesDates = [];
    for (let date of allDatesSet) {
      if (scoreDateMap.has(date) && topicDateMap.has(date)) {
        bothTypesDates.push(date);
      }
    }

    const sortedBothDates = bothTypesDates.sort((a, b) => new Date(a) - new Date(b));
    let maxStreak = 0;
    let currentStreak = 1;
    let streakStart = null;
    let streakEnd = null;
    let tempStart = null;
    if (sortedBothDates.length > 0) {
      tempStart = sortedBothDates[0];
    }

    for (let i = 1; i < sortedBothDates.length; i++) {
      const prev = moment(sortedBothDates[i - 1]);
      const curr = moment(sortedBothDates[i]);
      if (curr.diff(prev, 'days') === 1) {
        currentStreak++;
      } else {
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak;
          streakStart = tempStart;
          streakEnd = sortedBothDates[i - 1];
        }
        currentStreak = 1;
        tempStart = sortedBothDates[i];
      }
    }

    if (currentStreak > maxStreak) {
      maxStreak = currentStreak;
      streakStart = tempStart;
      streakEnd = sortedBothDates[sortedBothDates.length - 1];
    }

    const markingSetting = await MarkingSetting.findOne({}).sort({ updatedAt: -1 }).lean();

    const response = {
      dates: result,
      largestStreak: {
        count: maxStreak,
        startDate: streakStart || null,
        endDate: streakEnd || null,
      },
    };

    if (maxStreak >= 7 && markingSetting?.weeklyBonus) {
      response.weeklyBonus = markingSetting.weeklyBonus;
    }

    if (maxStreak >= 30 && markingSetting?.monthlyBonus) {
      response.monthlyBonus = markingSetting.monthlyBonus;
    }

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error in StrikeBothSameDate:', error);
    return res.status(500).json({ message: error.message });
  }
};



// exports.Strikecalculation = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { type = '' } = req.query;
//     const typeArray = Array.isArray(type) ? type : type.split(',');

//     const scoreQuery = { userId, strickStatus: true };
//     const topicScoreQuery = { userId, strickStatus: true };

//     const scores = await LearningScore.find(scoreQuery)
//       .populate('learningId', 'name')
//       .lean();

//     const topicScores = await TopicScore.find(topicScoreQuery)
//       .populate('learningId', 'name')
//       .lean();

//     const scoreDateMap = new Map();
//     const topicDateMap = new Map();
//     const allDatesSet = new Set();

//     scores.forEach(score => {
//       const date = moment(score.scoreDate).format('YYYY-MM-DD');
//       allDatesSet.add(date);
//       if (!scoreDateMap.has(date)) scoreDateMap.set(date, []);
//       scoreDateMap.get(date).push({ type: 'practice' });
//     });

//     topicScores.forEach(score => {
//       const date = moment(score.updatedAt).format('YYYY-MM-DD');
//       allDatesSet.add(date);
//       if (!topicDateMap.has(date)) topicDateMap.set(date, []);
//       topicDateMap.get(date).push({ type: 'topic' });
//     });

//     const result = [];
//     for (let date of allDatesSet) {
//       const scoreItems = scoreDateMap.get(date) || [];
//       const topicItems = topicDateMap.get(date) || [];

//       if (typeArray.includes('topic') && typeArray.includes('practice')) {
//         if (scoreItems.length > 0 && topicItems.length > 0) {
//           result.push({ date });
//         }
//       } else if (typeArray.length === 1 && typeArray.includes('practice')) {
//         if (scoreItems.length > 0) {
//           result.push({ date });
//         }
//       } else if (typeArray.length === 1 && typeArray.includes('topic')) {
//         if (topicItems.length > 0) {
//           result.push({ date });
//         }
//       }
//     }

//     result.sort((a, b) => new Date(a.date) - new Date(b.date));

//     // --- Streak Calculations ---
//     let largestStreak = { count: 0, startDate: null, endDate: null };
//     let currentStreak = { count: 0, startDate: null, endDate: null };
//     const weeklyBonus = [];
//     const monthlyBonus = [];

//     const sortedDates = result.map(r => r.date).sort();
//     let streakStart = null;
//     let tempStreak = [];

//     for (let i = 0; i < sortedDates.length; i++) {
//       const curr = moment(sortedDates[i]);
//       const prev = i > 0 ? moment(sortedDates[i - 1]) : null;

//       if (!prev || curr.diff(prev, 'days') === 1) {
//         if (!streakStart) streakStart = sortedDates[i];
//         tempStreak.push(sortedDates[i]);
//       } else {
//         // Finalize last streak
//         if (tempStreak.length > largestStreak.count) {
//           largestStreak = {
//             count: tempStreak.length,
//             startDate: streakStart,
//             endDate: tempStreak[tempStreak.length - 1]
//           };
//         }

//         // Calculate bonuses in this streak
//         for (let j = 0; j + 6 < tempStreak.length; j += 7) {
//           weeklyBonus.push({
//             week: weeklyBonus.length + 1,
//             startDate: tempStreak[j],
//             endDate: tempStreak[j + 6]
//           });
//         }

//         for (let j = 0; j + 29 < tempStreak.length; j += 30) {
//           monthlyBonus.push({
//             month: monthlyBonus.length + 1,
//             startDate: tempStreak[j],
//             endDate: tempStreak[j + 29]
//           });
//         }

//         // reset streak
//         streakStart = sortedDates[i];
//         tempStreak = [sortedDates[i]];
//       }
//     }

//     // Final update after loop ends
//     if (tempStreak.length > 0) {
//       if (tempStreak.length > largestStreak.count) {
//         largestStreak = {
//           count: tempStreak.length,
//           startDate: streakStart,
//           endDate: tempStreak[tempStreak.length - 1]
//         };
//       }

//       for (let j = 0; j + 6 < tempStreak.length; j += 7) {
//         weeklyBonus.push({
//           week: weeklyBonus.length + 1,
//           startDate: tempStreak[j],
//           endDate: tempStreak[j + 6]
//         });
//       }

//       for (let j = 0; j + 29 < tempStreak.length; j += 30) {
//         monthlyBonus.push({
//           month: monthlyBonus.length + 1,
//           startDate: tempStreak[j],
//           endDate: tempStreak[j + 29]
//         });
//       }

//       // this is the last streak, so it's current
//       currentStreak = {
//         count: tempStreak.length,
//         startDate: streakStart,
//         endDate: tempStreak[tempStreak.length - 1]
//       };
//     }

//     const response = {
//       dates: result,
//       largestStreak,
//       currentStreak,
//       weeklyBonus,
//       monthlyBonus
//     };

//     return res.status(200).json(response);
//   } catch (error) {
//     console.error('Error in StrikeBothSameDate:', error);
//     return res.status(500).json({ message: error.message });
//   }
// };

exports.Strikecalculation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type = '' } = req.query;
    const typeArray = Array.isArray(type) ? type : type.split(',');

    // Fetch practice scores
    const scoreQuery = { userId, strickStatus: true };
    const topicScoreQuery = { userId, strickStatus: true };

    const scores = await LearningScore.find(scoreQuery).populate('learningId', 'name').lean();
    const topicScores = await TopicScore.find(topicScoreQuery).populate('learningId', 'name').lean();

    const scoreDateMap = new Map();
    const topicDateMap = new Map();
    const allDatesSet = new Set();

    // Map practice scores by date
    scores.forEach(score => {
      const date = moment(score.scoreDate).format('YYYY-MM-DD');
      allDatesSet.add(date);
      if (!scoreDateMap.has(date)) scoreDateMap.set(date, []);
      scoreDateMap.get(date).push({
        strickStatus: score.strickStatus,
        score: score.score,
        updatedAt: score.updatedAt,
        scoreDate: score.scoreDate,
        type: 'practice',
        learningId: score.learningId
      });
    });

    // Map topic scores by date
    topicScores.forEach(score => {
      const date = moment(score.updatedAt).format('YYYY-MM-DD');
      allDatesSet.add(date);
      if (!topicDateMap.has(date)) topicDateMap.set(date, []);
      topicDateMap.get(date).push({
        strickStatus: score.strickStatus,
        score: score.score,
        updatedAt: score.updatedAt,
        type: 'topic',
        learningId: score.learningId
      });
    });

    // Prepare result array based on type filter
    const result = [];
    for (let date of allDatesSet) {
      const scoreItems = scoreDateMap.get(date) || [];
      const topicItems = topicDateMap.get(date) || [];

      if (typeArray.includes('topic') && typeArray.includes('practice')) {
        if (scoreItems.length > 0 && topicItems.length > 0) {
          result.push({ date });
        }
      } else if (typeArray.length === 1 && typeArray.includes('practice')) {
        if (scoreItems.length > 0) {
          result.push({ date, data: scoreItems });
        }
      } else if (typeArray.length === 1 && typeArray.includes('topic')) {
        if (topicItems.length > 0) {
          result.push({ date, data: topicItems });
        }
      }
    }

    // Sort by date ascending
    result.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Exclude specific dates from final results
    const excludedDates = new Set(['2025-06-05', '2025-06-06']);
    const filteredResult = result.filter(item => !excludedDates.has(item.date));

    // Compute largest and current streak based on filteredResult dates
    const filteredDates = filteredResult.map(item => item.date).sort((a, b) => new Date(a) - new Date(b));

    let largestStreak = 0;
    let currentStiker = 0;
    let maxStartDate = null;
    let maxEndDate = null;
    let currentStartDate = null;

    if (filteredDates.length > 0) {
      let streakCount = 1;
      let streakStart = filteredDates[0];
      let prevDate = moment(filteredDates[0]);

      for (let i = 1; i < filteredDates.length; i++) {
        const currDate = moment(filteredDates[i]);
        if (currDate.diff(prevDate, 'days') === 1) {
          streakCount++;
        } else {
          // Check if this streak is largest
          if (streakCount > largestStreak) {
            largestStreak = streakCount;
            maxStartDate = streakStart;
            maxEndDate = filteredDates[i - 1];
          }
          streakCount = 1;
          streakStart = filteredDates[i];
        }
        prevDate = currDate;
      }

      // Final check after loop
      if (streakCount > largestStreak) {
        largestStreak = streakCount;
        maxStartDate = streakStart;
        maxEndDate = filteredDates[filteredDates.length - 1];
      }

      // Calculate current streak starting from last date backward
      currentStiker = 1;
      currentStartDate = filteredDates[filteredDates.length - 1];
      for (let i = filteredDates.length - 2; i >= 0; i--) {
        const current = moment(filteredDates[i]);
        const next = moment(filteredDates[i + 1]);
        if (next.diff(current, 'days') === 1) {
          currentStiker++;
          currentStartDate = filteredDates[i];
        } else {
          break;
        }
      }
    }

    // Calculate weeklyBonusCount and monthlyBonusCount
    const weeklyBonusCount = Math.floor(largestStreak / 7);
    const monthlyBonusCount = Math.floor(largestStreak / 30);

    // Optionally fetch bonus info from DB
    const markingSetting = await MarkingSetting.findOne({}).sort({ updatedAt: -1 }).lean();
    const weeklyBonus = weeklyBonusCount > 0 && markingSetting?.weeklyBonus ? markingSetting.weeklyBonus : 0;
    const monthlyBonus = monthlyBonusCount > 0 && markingSetting?.monthlyBonus ? markingSetting.monthlyBonus : 0;

    // Prepare response
    const response = {
      dates: filteredResult,
      largestStreak: {
        count: largestStreak,
        startDate: maxStartDate,
        endDate: maxEndDate,
      },
      currentStiker: {
        count: currentStiker,
        startDate: currentStartDate,
        endDate: filteredDates.length ? filteredDates[filteredDates.length - 1] : null,
      },
      weeklyBonusCount,
      monthlyBonusCount,
      weeklyBonus,
      monthlyBonus,
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error in StrikeBothSameDate:', error);
    return res.status(500).json({ message: error.message });
  }
};