
const moment = require('moment');
const mongoose = require('mongoose');
const Learning = require('../models/learning');
const Assigned = require('../models/assignlearning'); 
const LearningScore = require('../models/learningScore');

const Topic = require('../models/topic'); 
const TopicScore = require('../models/topicScore');
const User = require('../models/User');
const GenralIQ = require("../models/genraliq");
const Quotes = require('../models/quotes');
const School = require('../models/school');
const College = require('../models/college');
const MarkingSetting = require('../models/markingSetting');

const Experienceleavel = require('../models/expirenceLeavel'); 

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

    // 🔍 Fetch user session
    const user = await User.findById(userId).lean();
    const userSession = user?.session;

    if (!userSession) {
      return res.status(400).json({ message: 'User session not found.' });
    }

    const rawScores = await TopicScore.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          session: userSession // ✅ Filter by session
        }
      },
      { $sort: { scoreDate: 1 } },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$scoreDate" }
          },
          doc: { $first: "$$ROOT" }
        }
      },
      { $replaceRoot: { newRoot: "$doc" } },
      { $sort: { scoreDate: 1 } }
    ]);

    const populatedScores = await TopicScore.populate(rawScores, [
      { path: 'topicId', select: 'topic' },
      { path: 'learningId', select: 'name' }
    ]);

    const todayStr = moment().format('YYYY-MM-DD');
    const todayScores = [];
    const otherScores = [];

    for (const score of populatedScores) {
      const scoreDateStr = moment(score.scoreDate).format('YYYY-MM-DD');
      if (scoreDateStr === todayStr) {
        todayScores.push(score);
      } else {
        otherScores.push(score);
      }
    }

    const finalScores = [...todayScores, ...otherScores];

    res.status(200).json({ scores: finalScores });

  } catch (error) {
    console.error('Error in scoreCard:', error);
    res.status(500).json({ message: error.message });
  }
};




// exports.scoreCard = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const rawScores = await TopicScore.aggregate([
//       { $match: { userId: new mongoose.Types.ObjectId(userId) } },
//       { $sort: { scoreDate: 1 } }, 
//       {
//         $group: {
//           _id: {
//             $dateToString: { format: "%Y-%m-%d", date: "$scoreDate" }
//           },
//           doc: { $first: "$$ROOT" }
//         }
//       },
//       { $replaceRoot: { newRoot: "$doc" } },
//       { $sort: { scoreDate: 1 } } 
//     ]);

//     const populatedScores = await TopicScore.populate(rawScores, [
//       { path: 'topicId', select: 'topic' },
//       { path: 'learningId', select: 'name' }
//     ]);

    
//     const todayStr = moment().format('YYYY-MM-DD');
//     const todayScores = [];
//     const otherScores = [];

//     for (const score of populatedScores) {
//       const scoreDateStr = moment(score.scoreDate).format('YYYY-MM-DD');
//       if (scoreDateStr === todayStr) {
//         todayScores.push(score);
//       } else {
//         otherScores.push(score);
//       }
//     }

    
//     const finalScores = [...todayScores, ...otherScores];

//     res.status(200).json({ scores: finalScores });

//   } catch (error) {
//     console.error('Error in scoreCard:', error);
//     res.status(500).json({ message: error.message });
//   }
// };




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

    const scores = await LearningScore.find(scoreQuery).lean();
    const topicScores = await TopicScore.find(topicScoreQuery).lean();
    const scoreDateMap = new Map();
    const topicDateMap = new Map();
    const allDatesSet = new Set();
    scores.forEach(score => {
      const date = moment(score.scoreDate).format('YYYY-MM-DD');
      allDatesSet.add(date);
      if (!scoreDateMap.has(date)) scoreDateMap.set(date, []);
      scoreDateMap.get(date).push(score);
    });

    topicScores.forEach(score => {
      const date = moment(score.updatedAt).format('YYYY-MM-DD');
      allDatesSet.add(date);
      if (!topicDateMap.has(date)) topicDateMap.set(date, []);
      topicDateMap.get(date).push(score);
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
          result.push({ date });
        }
      } else if (typeArray.length === 1 && typeArray.includes('topic')) {
        if (topicItems.length > 0) {
          result.push({ date });
        }
      }
    }

    result.sort((a, b) => new Date(a.date) - new Date(b.date));

    return res.status(200).json({ dates: result });

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

//         // Weekly Bonus
//         for (let j = 0; j + 6 < tempStreak.length; j += 7) {
//           weeklyBonus.push({
//             week: weeklyBonus.length + 1,
//             startDate: tempStreak[j],
//             endDate: tempStreak[j + 6]
//           });
//         }

//         // Monthly Bonus
//         for (let j = 0; j + 29 < tempStreak.length; j += 30) {
//           monthlyBonus.push({
//             month: monthlyBonus.length + 1,
//             startDate: tempStreak[j],
//             endDate: tempStreak[j + 29]
//           });
//         }

//         // Reset streak
//         streakStart = sortedDates[i];
//         tempStreak = [sortedDates[i]];
//       }
//     }

//     // Final streak update
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

//       currentStreak = {
//         count: tempStreak.length,
//         startDate: streakStart,
//         endDate: tempStreak[tempStreak.length - 1]
//       };
//     }

//     // ✅ Final Response (without dates array)
//     const response = {
//       largestStreak,
//       currentStreak,
//       weeklyBonus,
//       monthlyBonus
//     };

//     return res.status(200).json(response);
//   } catch (error) {
//     console.error('Error in Strikecalculation:', error);
//     return res.status(500).json({ message: error.message });
//   }
// };

exports.Strikecalculation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type = '' } = req.query;
    const typeArray = Array.isArray(type) ? type : type.split(',');

    // Get the user's current session
    const user = await User.findById(userId).lean();
    if (!user || !user.session) {
      return res.status(400).json({ message: 'User session not found.' });
    }

    const scoreQuery = { userId, session: user.session, strickStatus: true };
    const topicScoreQuery = { userId, session: user.session, strickStatus: true };

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
      scoreDateMap.get(date).push({ type: 'practice' });
    });

    topicScores.forEach(score => {
      const date = moment(score.updatedAt).format('YYYY-MM-DD');
      allDatesSet.add(date);
      if (!topicDateMap.has(date)) topicDateMap.set(date, []);
      topicDateMap.get(date).push({ type: 'topic' });
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
          result.push({ date });
        }
      } else if (typeArray.length === 1 && typeArray.includes('topic')) {
        if (topicItems.length > 0) {
          result.push({ date });
        }
      }
    }

    result.sort((a, b) => new Date(a.date) - new Date(b.date));

    // --- Streak Calculations ---
    let largestStreak = { count: 0, startDate: null, endDate: null };
    let currentStreak = { count: 0, startDate: null, endDate: null };
    const weeklyBonus = [];
    const monthlyBonus = [];

    const sortedDates = result.map(r => r.date).sort();
    let streakStart = null;
    let tempStreak = [];

    for (let i = 0; i < sortedDates.length; i++) {
      const curr = moment(sortedDates[i]);
      const prev = i > 0 ? moment(sortedDates[i - 1]) : null;

      if (!prev || curr.diff(prev, 'days') === 1) {
        if (!streakStart) streakStart = sortedDates[i];
        tempStreak.push(sortedDates[i]);
      } else {
        // Finalize last streak
        if (tempStreak.length > largestStreak.count) {
          largestStreak = {
            count: tempStreak.length,
            startDate: streakStart,
            endDate: tempStreak[tempStreak.length - 1]
          };
        }

        // Weekly Bonus
        for (let j = 0; j + 6 < tempStreak.length; j += 7) {
          weeklyBonus.push({
            week: weeklyBonus.length + 1,
            startDate: tempStreak[j],
            endDate: tempStreak[j + 6]
          });
        }

        // Monthly Bonus
        for (let j = 0; j + 29 < tempStreak.length; j += 30) {
          monthlyBonus.push({
            month: monthlyBonus.length + 1,
            startDate: tempStreak[j],
            endDate: tempStreak[j + 29]
          });
        }

        streakStart = sortedDates[i];
        tempStreak = [sortedDates[i]];
      }
    }

    // Final streak update
    if (tempStreak.length > 0) {
      if (tempStreak.length > largestStreak.count) {
        largestStreak = {
          count: tempStreak.length,
          startDate: streakStart,
          endDate: tempStreak[tempStreak.length - 1]
        };
      }

      for (let j = 0; j + 6 < tempStreak.length; j += 7) {
        weeklyBonus.push({
          week: weeklyBonus.length + 1,
          startDate: tempStreak[j],
          endDate: tempStreak[j + 6]
        });
      }

      for (let j = 0; j + 29 < tempStreak.length; j += 30) {
        monthlyBonus.push({
          month: monthlyBonus.length + 1,
          startDate: tempStreak[j],
          endDate: tempStreak[j + 29]
        });
      }

      currentStreak = {
        count: tempStreak.length,
        startDate: streakStart,
        endDate: tempStreak[tempStreak.length - 1]
      };
    }

    return res.status(200).json({
      largestStreak,
      currentStreak,
      weeklyBonus,
      monthlyBonus
    });

  } catch (error) {
    console.error('Error in Strikecalculation:', error);
    return res.status(500).json({ message: error.message });
  }
};




// exports.StrikePath = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const requestedLevel = parseInt(req.query.level || 0);
//     const scores = await LearningScore.find({ userId, strickStatus: true })
//       .populate('learningId', 'name')
//       .sort({ scoreDate: 1 })
//       .lean();
//     const topicScores = await TopicScore.find({ userId, strickStatus: true })
//       .populate('learningId', 'name')
//       .sort({ updatedAt: 1 })
//       .lean();
//     const scoreMap = new Map();
//     scores.forEach(score => {
//       const date = moment(score.scoreDate).format('YYYY-MM-DD');
//       if (!scoreMap.has(date)) scoreMap.set(date, []);
//       const exists = scoreMap.get(date).some(item => item.type === 'practice');
//       if (!exists) {
//         scoreMap.get(date).push({
//           type: 'practice',
//           score: score.score,
//           updatedAt: score.updatedAt,
//           scoreDate: score.scoreDate,
//           learningId: score.learningId,
//           strickStatus: score.strickStatus
//         });
//       }
//     });

//     topicScores.forEach(score => {
//       const date = moment(score.updatedAt).format('YYYY-MM-DD');
//       if (!scoreMap.has(date)) scoreMap.set(date, []);
//       const exists = scoreMap.get(date).some(item => item.type === 'topic');
//       if (!exists) {
//         scoreMap.get(date).push({
//           type: 'topic',
//           score: score.score,
//           updatedAt: score.updatedAt,
//           learningId: score.learningId,
//           strickStatus: score.strickStatus
//         });
//       }
//     });

//     const markingSetting = await MarkingSetting.findOne({}).sort({ updatedAt: -1 }).lean();
//     const baseDailyExp = markingSetting?.dailyExperience || 0;
//     const deductions = markingSetting?.deductions || 0;
//     const weeklyBonus = markingSetting?.weeklyBonus || 0;
//     const monthlyBonus = markingSetting?.monthlyBonus || 0;
//     const experiencePoint = markingSetting?.experiencePoint || 1000;

//     const datesList = Array.from(scoreMap.keys()).sort();
//     if (datesList.length === 0) {
//       return res.status(200).json({ bonuspoint: 0, levelBonusPoint: 0, experiencePoint, level: 1, dates: [] });
//     }

//     const startDate = moment(datesList[0]);
//     const endDate = moment(datesList[datesList.length - 1]);

//     const result = [];
//     const user = await User.findById(userId).lean();
//     const existingBonusDates = user?.bonusDates || [];
//     const existingDeductedDates = user?.deductedDates || [];
//     const existingWeeklyBonusDates = user?.weeklyBonusDates || [];
//     const existingMonthlyBonusDates = user?.monthlyBonusDates || [];

//     let bonusToAdd = 0;
//     let datesToAddBonus = [];
//     let deductionToSubtract = 0;
//     let datesToDeduct = [];
//     let weeklyBonusToAdd = 0;
//     let weeklyBonusDatesToAdd = [];
//     let monthlyBonusToAdd = 0;
//     let monthlyBonusDatesToAdd = [];

//     for (let m = moment(startDate); m.diff(endDate, 'days') <= 0; m.add(1, 'days')) {
//       const currentDate = m.format('YYYY-MM-DD');
//       const item = { date: currentDate, data: [] };

//       if (scoreMap.has(currentDate)) {
//         item.data = scoreMap.get(currentDate);
//         const types = item.data.map(d => d.type);
//         const hasPractice = types.includes('practice');
//         const hasTopic = types.includes('topic');

//         if (hasPractice && hasTopic && baseDailyExp > 0) {
//           const practiceScore = item.data.find(d => d.type === 'practice')?.score || 0;
//           const topicScore = item.data.find(d => d.type === 'topic')?.score || 0;
//           const avgScore = (practiceScore + topicScore) / 2;
//           const calculatedDailyExp = Math.round((baseDailyExp / 100) * avgScore * 100) / 100;
//           item.dailyExperience = calculatedDailyExp;

//           if (!existingBonusDates.includes(currentDate)) {
//             bonusToAdd += calculatedDailyExp;
//             datesToAddBonus.push(currentDate);
//           }
//         }
//       } else {
//         item.deduction = deductions;
//         if (!existingDeductedDates.includes(currentDate)) {
//           deductionToSubtract += deductions;
//           datesToDeduct.push(currentDate);
//         }
//       }

//       result.push(item);
//     }

//     for (let i = 6; i < result.length; i++) {
//       let isStreak = true;
//       for (let j = i - 6; j <= i; j++) {
//         const dayData = result[j]?.data || [];
//         const hasPractice = dayData.some(item => item.type === 'practice');
//         const hasTopic = dayData.some(item => item.type === 'topic');
//         if (!(hasPractice && hasTopic)) {
//           isStreak = false;
//           break;
//         }
//       }

//       const bonusDate = result[i].date;
//       if (isStreak && !existingWeeklyBonusDates.includes(bonusDate)) {
//         result[i].weeklyBonus = weeklyBonus;
//         weeklyBonusToAdd += weeklyBonus;
//         weeklyBonusDatesToAdd.push(bonusDate);
//       }

//       if (existingWeeklyBonusDates.includes(bonusDate)) {
//         result[i].weeklyBonus = weeklyBonus;
//       }
//     }

//     for (let i = 29; i < result.length; i++) {
//       let isMonthlyStreak = true;
//       for (let j = i - 29; j <= i; j++) {
//         const dayData = result[j]?.data || [];
//         const hasPractice = dayData.some(item => item.type === 'practice');
//         const hasTopic = dayData.some(item => item.type === 'topic');
//         if (!(hasPractice && hasTopic)) {
//           isMonthlyStreak = false;
//           break;
//         }
//       }

//       const bonusDate = result[i].date;
//       if (isMonthlyStreak && !existingMonthlyBonusDates.includes(bonusDate)) {
//         result[i].monthlyBonus = monthlyBonus;
//         monthlyBonusToAdd += monthlyBonus;
//         monthlyBonusDatesToAdd.push(bonusDate);
//       }

//       if (existingMonthlyBonusDates.includes(bonusDate)) {
//         result[i].monthlyBonus = monthlyBonus;
//       }
//     }

//     const updateData = {};
//     if (bonusToAdd > 0) {
//       updateData.$inc = { bonuspoint: bonusToAdd };
//       updateData.$push = { bonusDates: { $each: datesToAddBonus } };
//     }
//     if (deductionToSubtract > 0) {
//       updateData.$inc = updateData.$inc || {};
//       updateData.$inc.bonuspoint = (updateData.$inc.bonuspoint || 0) - deductionToSubtract;
//       updateData.$push = updateData.$push || {};
//       updateData.$push.deductedDates = { $each: datesToDeduct };
//     }
//     if (weeklyBonusToAdd > 0) {
//       updateData.$inc = updateData.$inc || {};
//       updateData.$inc.bonuspoint = (updateData.$inc.bonuspoint || 0) + weeklyBonusToAdd;
//       updateData.$push = updateData.$push || {};
//       updateData.$push.weeklyBonusDates = { $each: weeklyBonusDatesToAdd };
//     }
//     if (monthlyBonusToAdd > 0) {
//       updateData.$inc = updateData.$inc || {};
//       updateData.$inc.bonuspoint = (updateData.$inc.bonuspoint || 0) + monthlyBonusToAdd;
//       updateData.$push = updateData.$push || {};
//       updateData.$push.monthlyBonusDates = { $each: monthlyBonusDatesToAdd };
//     }

//     if (Object.keys(updateData).length > 0) {
//       await User.findByIdAndUpdate(userId, updateData);
//     }

//     const updatedUser = await User.findById(userId).select('bonuspoint userLevelData').lean();
//     const newLevel = await getLevelFromPoints(updatedUser.bonuspoint);

//     await User.findByIdAndUpdate(userId, { level: newLevel });

//     let levelBonusPoint = 0;
//     for (const item of result) {
//       if (item.dailyExperience) levelBonusPoint += item.dailyExperience;
//       if (item.weeklyBonus) levelBonusPoint += item.weeklyBonus;
//       if (item.monthlyBonus) levelBonusPoint += item.monthlyBonus;
//       if (item.deduction) levelBonusPoint -= item.deduction;
//     }
//     levelBonusPoint = Math.round(levelBonusPoint * 100) / 100;

//     await User.findByIdAndUpdate(userId, {
//       $pull: { userLevelData: { level: newLevel } }
//     });
//     await User.findByIdAndUpdate(userId, {
//       $push: {
//         userLevelData: {
//           level: newLevel,
//           levelBonusPoint,
//           data: result
//         }
//       }
//     });

//     let filteredResult = result;
//     if (requestedLevel && requestedLevel !== newLevel) {
//       const matched = updatedUser.userLevelData.find(l => l.level === requestedLevel);
//       filteredResult = matched?.data || [];
//     }

//     return res.status(200).json({
//       bonuspoint: updatedUser?.bonuspoint || 0,
//       levelBonusPoint,
//       experiencePoint,
//       level: newLevel,
//       dates: filteredResult
//     });

//   } catch (error) {
//     console.error('StrikePath error:', error);
//     return res.status(500).json({ message: error.message });
//   }
// };


exports.StrikePath = async (req, res) => {
  try {
    const userId = req.user._id;
    const requestedLevel = parseInt(req.query.level || 0);

    const user = await User.findById(userId).lean();
    if (!user?.session) {
      return res.status(400).json({ message: 'User session not found.' });
    }

    const session = user.session;

    const scores = await LearningScore.find({ userId, session, strickStatus: true })
      .populate('learningId', 'name')
      .sort({ scoreDate: 1 })
      .lean();

    const topicScores = await TopicScore.find({ userId, session, strickStatus: true })
      .populate('learningId', 'name')
      .sort({ updatedAt: 1 })
      .lean();

    const scoreMap = new Map();

    scores.forEach(score => {
      const date = moment(score.scoreDate).format('YYYY-MM-DD');
      if (!scoreMap.has(date)) scoreMap.set(date, []);
      const exists = scoreMap.get(date).some(item => item.type === 'practice');
      if (!exists) {
        scoreMap.get(date).push({
          type: 'practice',
          score: score.score,
          updatedAt: score.updatedAt,
          scoreDate: score.scoreDate,
          learningId: score.learningId,
          strickStatus: score.strickStatus
        });
      }
    });

    topicScores.forEach(score => {
      const date = moment(score.updatedAt).format('YYYY-MM-DD');
      if (!scoreMap.has(date)) scoreMap.set(date, []);
      const exists = scoreMap.get(date).some(item => item.type === 'topic');
      if (!exists) {
        scoreMap.get(date).push({
          type: 'topic',
          score: score.score,
          updatedAt: score.updatedAt,
          learningId: score.learningId,
          strickStatus: score.strickStatus
        });
      }
    });

    const markingSetting = await MarkingSetting.findOne({}).sort({ updatedAt: -1 }).lean();
    const baseDailyExp = markingSetting?.dailyExperience || 0;
    const deductions = markingSetting?.deductions || 0;
    const weeklyBonus = markingSetting?.weeklyBonus || 0;
    const monthlyBonus = markingSetting?.monthlyBonus || 0;
    const experiencePoint = markingSetting?.experiencePoint || 1000;

    const datesList = Array.from(scoreMap.keys()).sort();
    if (datesList.length === 0) {
      return res.status(200).json({
        bonuspoint: 0,
        levelBonusPoint: 0,
        experiencePoint,
        level: 1,
        dates: []
      });
    }

    const startDate = moment(datesList[0]);
    const endDate = moment(datesList[datesList.length - 1]);

    const result = [];

    const existingBonusDates = user?.bonusDates || [];
    const existingDeductedDates = user?.deductedDates || [];
    const existingWeeklyBonusDates = user?.weeklyBonusDates || [];
    const existingMonthlyBonusDates = user?.monthlyBonusDates || [];

    let bonusToAdd = 0, deductionToSubtract = 0;
    let weeklyBonusToAdd = 0, monthlyBonusToAdd = 0;
    let datesToAddBonus = [], datesToDeduct = [], weeklyBonusDatesToAdd = [], monthlyBonusDatesToAdd = [];

    for (let m = moment(startDate); m.diff(endDate, 'days') <= 0; m.add(1, 'days')) {
      const currentDate = m.format('YYYY-MM-DD');
      const item = { date: currentDate, data: [] };

      if (scoreMap.has(currentDate)) {
        item.data = scoreMap.get(currentDate);
        const types = item.data.map(d => d.type);
        const hasPractice = types.includes('practice');
        const hasTopic = types.includes('topic');

        if (hasPractice && hasTopic && baseDailyExp > 0) {
          const practiceScore = item.data.find(d => d.type === 'practice')?.score || 0;
          const topicScore = item.data.find(d => d.type === 'topic')?.score || 0;
          const avgScore = (practiceScore + topicScore) / 2;
          const calculatedDailyExp = Math.round((baseDailyExp / 100) * avgScore * 100) / 100;
          item.dailyExperience = calculatedDailyExp;

          if (!existingBonusDates.includes(currentDate)) {
            bonusToAdd += calculatedDailyExp;
            datesToAddBonus.push(currentDate);
          }
        }
      } else {
        item.deduction = deductions;
        if (!existingDeductedDates.includes(currentDate)) {
          deductionToSubtract += deductions;
          datesToDeduct.push(currentDate);
        }
      }

      result.push(item);
    }

    // Weekly bonus
    for (let i = 6; i < result.length; i++) {
      const streak = result.slice(i - 6, i + 1).every(r =>
        r.data.some(d => d.type === 'practice') &&
        r.data.some(d => d.type === 'topic')
      );
      const bonusDate = result[i].date;

      if (streak && !existingWeeklyBonusDates.includes(bonusDate)) {
        result[i].weeklyBonus = weeklyBonus;
        weeklyBonusToAdd += weeklyBonus;
        weeklyBonusDatesToAdd.push(bonusDate);
      }

      if (existingWeeklyBonusDates.includes(bonusDate)) {
        result[i].weeklyBonus = weeklyBonus;
      }
    }

    // Monthly bonus
    for (let i = 29; i < result.length; i++) {
      const streak = result.slice(i - 29, i + 1).every(r =>
        r.data.some(d => d.type === 'practice') &&
        r.data.some(d => d.type === 'topic')
      );
      const bonusDate = result[i].date;

      if (streak && !existingMonthlyBonusDates.includes(bonusDate)) {
        result[i].monthlyBonus = monthlyBonus;
        monthlyBonusToAdd += monthlyBonus;
        monthlyBonusDatesToAdd.push(bonusDate);
      }

      if (existingMonthlyBonusDates.includes(bonusDate)) {
        result[i].monthlyBonus = monthlyBonus;
      }
    }

    // Update user bonuses
    const updateData = {};
    if (bonusToAdd > 0) {
      updateData.$inc = { bonuspoint: bonusToAdd };
      updateData.$push = { bonusDates: { $each: datesToAddBonus } };
    }
    if (deductionToSubtract > 0) {
      updateData.$inc = updateData.$inc || {};
      updateData.$inc.bonuspoint = (updateData.$inc.bonuspoint || 0) - deductionToSubtract;
      updateData.$push = updateData.$push || {};
      updateData.$push.deductedDates = { $each: datesToDeduct };
    }
    if (weeklyBonusToAdd > 0) {
      updateData.$inc = updateData.$inc || {};
      updateData.$inc.bonuspoint = (updateData.$inc.bonuspoint || 0) + weeklyBonusToAdd;
      updateData.$push = updateData.$push || {};
      updateData.$push.weeklyBonusDates = { $each: weeklyBonusDatesToAdd };
    }
    if (monthlyBonusToAdd > 0) {
      updateData.$inc = updateData.$inc || {};
      updateData.$inc.bonuspoint = (updateData.$inc.bonuspoint || 0) + monthlyBonusToAdd;
      updateData.$push = updateData.$push || {};
      updateData.$push.monthlyBonusDates = { $each: monthlyBonusDatesToAdd };
    }

    if (Object.keys(updateData).length > 0) {
      await User.findByIdAndUpdate(userId, updateData);
    }

    const updatedUser = await User.findById(userId).select('bonuspoint userLevelData session').lean();
    const newLevel = await getLevelFromPoints(updatedUser.bonuspoint);

    await User.findByIdAndUpdate(userId, { level: newLevel });
    await User.findByIdAndUpdate(userId, { $pull: { userLevelData: { level: newLevel } } });

    const levelBonusPoint = result.reduce((acc, item) =>
      acc + (item.dailyExperience || 0) + (item.weeklyBonus || 0) + (item.monthlyBonus || 0) - (item.deduction || 0), 0
    );

    await User.findByIdAndUpdate(userId, {
      $push: {
        userLevelData: {
          level: newLevel,
          levelBonusPoint,
          data: result
        }
      }
    });

    // ✅ Save levelBonusPoint in Experienceleavel model
    await Experienceleavel.create({
      userId,
      levelBonusPoint,
      session: updatedUser.session
    });

    const matched = requestedLevel && requestedLevel !== newLevel
      ? updatedUser.userLevelData.find(l => l.level === requestedLevel)?.data || []
      : result;

    return res.status(200).json({
      bonuspoint: updatedUser?.bonuspoint || 0,
      levelBonusPoint,
      experiencePoint,
      level: newLevel,
      dates: matched
    });

  } catch (error) {
    console.error('StrikePath error:', error);
    return res.status(500).json({ message: error.message });
  }
};

// Helper Function
const getLevelFromPoints = async (points) => {
  const setting = await MarkingSetting.findOne({}).sort({ updatedAt: -1 }).lean();
  const experiencePoint = setting?.experiencePoint || 1000;

  if (points < experiencePoint) return 1;
  const level = Math.floor(points / experiencePoint) + 1;
  return level;
};



exports.getUserLevelData = async (req, res) => {
  try {
    const userId = req.user._id;
    const { level } = req.query;

    const user = await User.findById(userId).lean();

    if (!user || !user.userLevelData) {
      return res.status(404).json({ message: "No level data found." });
    }

    const data = user.userLevelData.find(item => item.level === Number(level));

    if (!data) {
      return res.status(404).json({ message: `No data found for level ${level}` });
    }

    return res.status(200).json(data);

  } catch (error) {
    console.error("getUserLevelData error:", error);
    return res.status(500).json({ message: error.message });
  }
};


// exports.genraliqAverage = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const learningIdFilter = req.query.learningId;
//     const learningScores = await LearningScore.find({ userId, strickStatus: true })
//       .populate('learningId', 'name')
//       .sort({ scoreDate: 1 })
//       .lean();

//     const topicScores = await TopicScore.find({ userId, strickStatus: true })
//       .populate('learningId', 'name')
//       .sort({ updatedAt: 1 })
//       .lean();

//     const scoreMap = new Map();

//     // Add practice scores
//     learningScores.forEach(score => {
//       if (learningIdFilter && score.learningId?._id?.toString() !== learningIdFilter) return;

//       const date = moment(score.scoreDate).format('YYYY-MM-DD');
//       if (!scoreMap.has(date)) scoreMap.set(date, []);
//       scoreMap.get(date).push({
//         type: 'practice',
//         score: score.score,
//         updatedAt: score.updatedAt,
//         scoreDate: score.scoreDate,
//         learningId: score.learningId
//       });
//     });

//     // Add topic scores
//     topicScores.forEach(score => {
//       if (learningIdFilter && score.learningId?._id?.toString() !== learningIdFilter) return;

//       const date = moment(score.updatedAt).format('YYYY-MM-DD');
//       if (!scoreMap.has(date)) scoreMap.set(date, []);
//       scoreMap.get(date).push({
//         type: 'topic',
//         score: score.score,
//         updatedAt: score.updatedAt,
//         learningId: score.learningId
//       });
//     });

//     const results = [];
//     let totalAvg = 0;
//     let count = 0;
//     let learningIdToSave = null;

//     for (const [date, records] of scoreMap.entries()) {
//       const hasPractice = records.some(r => r.type === 'practice');
//       const hasTopic = records.some(r => r.type === 'topic');

//       if (hasPractice && hasTopic) {
//         const practiceScore = records.find(r => r.type === 'practice')?.score || 0;
//         const topicScore = records.find(r => r.type === 'topic')?.score || 0;
//         const avg = (practiceScore + topicScore) / 2;

//         learningIdToSave = records[0]?.learningId?._id || records[0]?.learningId;

//         results.push({
//           date,
//           data: records,
//           average: Math.round(avg * 100) / 100
//         });

//         totalAvg += avg;
//         count += 1;
//       }
//     }

//     const overallAverage = count > 0 ? Math.round((totalAvg / count) * 100) / 100 : 0;

//     // ✅ Save to GenralIQ only if learningId is provided and valid
//     if (learningIdToSave) {
//       await GenralIQ.findOneAndUpdate(
//         { userId, learningId: learningIdToSave },
//         { overallAverage },
//         { upsert: true, new: true }
//       );
//     }

//     return res.status(200).json({
//       count,
//       overallAverage,
//       results
//     });

//   } catch (error) {
//     console.error("Error in genraliqAverage:", error);
//     return res.status(500).json({ message: error.message });
//   }
// };


exports.genraliqAverage = async (req, res) => {
  try {
    const userId = req.user._id;

    // Fetch user to get session
    const user = await User.findById(userId).lean();
    if (!user || !user.session) {
      return res.status(400).json({ message: 'User session not found.' });
    }

    const learningIdFilter = req.query.learningId;

    const learningScores = await LearningScore.find({
      userId,
      session: user.session, // ✅ Filter by session
      strickStatus: true
    })
      .populate('learningId', 'name')
      .sort({ scoreDate: 1 })
      .lean();

    const topicScores = await TopicScore.find({
      userId,
      session: user.session, // ✅ Filter by session
      strickStatus: true
    })
      .populate('learningId', 'name')
      .sort({ updatedAt: 1 })
      .lean();

    const scoreMap = new Map();

    // Add practice scores
    learningScores.forEach(score => {
      if (learningIdFilter && score.learningId?._id?.toString() !== learningIdFilter) return;

      const date = moment(score.scoreDate).format('YYYY-MM-DD');
      if (!scoreMap.has(date)) scoreMap.set(date, []);
      scoreMap.get(date).push({
        type: 'practice',
        score: score.score,
        updatedAt: score.updatedAt,
        scoreDate: score.scoreDate,
        learningId: score.learningId
      });
    });

    // Add topic scores
    topicScores.forEach(score => {
      if (learningIdFilter && score.learningId?._id?.toString() !== learningIdFilter) return;

      const date = moment(score.updatedAt).format('YYYY-MM-DD');
      if (!scoreMap.has(date)) scoreMap.set(date, []);
      scoreMap.get(date).push({
        type: 'topic',
        score: score.score,
        updatedAt: score.updatedAt,
        learningId: score.learningId
      });
    });

    const results = [];
    let totalAvg = 0;
    let count = 0;
    let learningIdToSave = null;

    for (const [date, records] of scoreMap.entries()) {
      const hasPractice = records.some(r => r.type === 'practice');
      const hasTopic = records.some(r => r.type === 'topic');

      if (hasPractice && hasTopic) {
        const practiceScore = records.find(r => r.type === 'practice')?.score || 0;
        const topicScore = records.find(r => r.type === 'topic')?.score || 0;
        const avg = (practiceScore + topicScore) / 2;

        learningIdToSave = records[0]?.learningId?._id || records[0]?.learningId;

        results.push({
          date,
          data: records,
          average: Math.round(avg * 100) / 100
        });

        totalAvg += avg;
        count += 1;
      }
    }

    const overallAverage = count > 0 ? Math.round((totalAvg / count) * 100) / 100 : 0;

    // ✅ Save with session
    if (learningIdToSave) {
      await GenralIQ.findOneAndUpdate(
        { userId, learningId: learningIdToSave, session: user.session }, // ✅ Include session
        { overallAverage },
        { upsert: true, new: true }
      );
    }

    return res.status(200).json({
      count,
      overallAverage,
      results
    });

  } catch (error) {
    console.error("Error in genraliqAverage:", error);
    return res.status(500).json({ message: error.message });
  }
};


exports.getGenrelIq = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).lean();
    if (!user || !user.className || !user.session) {
      return res.status(400).json({ message: 'User className or session not found.' });
    }

    const assignedList = await Assigned.find({ classId: user.className })
      .populate('learning')
      .populate('learning2')
      .populate('learning3')
      .populate('learning4')
      .lean();

    for (let item of assignedList) {
      // Get school or college info
      let classInfo = await School.findById(item.classId).lean();
      if (!classInfo) {
        classInfo = await College.findById(item.classId).lean();
      }
      item.classInfo = classInfo || null;

      // Get IQ score from GenralIQ collection with session filter
      const getIQScore = async (learningField) => {
        if (item[learningField]?._id) {
          const iqRecord = await GenralIQ.findOne({
            userId,
            session: user.session, // ✅ filter by user's session
            learningId: item[learningField]._id,
          }).lean();

          return iqRecord?.overallAverage ?? 0; // return 0 if no record found
        }
        return 0;
      };

      // Handle empty/null learning references
      if (!item.learning || Object.keys(item.learning).length === 0) item.learning = null;
      if (!item.learning2 || Object.keys(item.learning2).length === 0) item.learning2 = null;
      if (!item.learning3 || Object.keys(item.learning3).length === 0) item.learning3 = null;
      if (!item.learning4 || Object.keys(item.learning4).length === 0) item.learning4 = null;

      // Attach GenralIQ scores (or 0 if not found)
      item.learningAverage = await getIQScore('learning');
      item.learning2Average = await getIQScore('learning2');
      item.learning3Average = await getIQScore('learning3');
      item.learning4Average = await getIQScore('learning4');
    }

    res.status(200).json({ data: assignedList });
  } catch (error) {
    console.error('Get GenrelIQ Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.Dashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    // --- Get user and session
    const user = await User.findById(userId).lean();
    if (!user || !user.session) {
      return res.status(400).json({ message: 'User or session not found.' });
    }

    const session = user.session;

    // --- Scores for Streak Calculation (session-based)
    const learningScores = await LearningScore.find({ userId, session, strickStatus: true }).lean();
    const topicScores = await TopicScore.find({ userId, session, strickStatus: true }).lean();

    const practiceDates = new Set(learningScores.map(s => moment(s.scoreDate).format('YYYY-MM-DD')));
    const topicDates = new Set(topicScores.map(s => moment(s.updatedAt).format('YYYY-MM-DD')));
    const commonDates = [...practiceDates].filter(date => topicDates.has(date)).sort();

    // --- currentStreak Calculation
    let currentStreak = { count: 0, startDate: null, endDate: null };
    let streakStart = null;
    let tempStreak = [];

    for (let i = 0; i < commonDates.length; i++) {
      const curr = moment(commonDates[i]);
      const prev = i > 0 ? moment(commonDates[i - 1]) : null;

      if (!prev || curr.diff(prev, 'days') === 1) {
        if (!streakStart) streakStart = commonDates[i];
        tempStreak.push(commonDates[i]);
      } else {
        tempStreak = [commonDates[i]];
        streakStart = commonDates[i];
      }
    }

    if (tempStreak.length > 0) {
      currentStreak = {
        count: tempStreak.length,
        startDate: streakStart,
        endDate: tempStreak[tempStreak.length - 1]
      };
    }

    const bonuspoint = user?.bonuspoint || 0;
    const level = user?.level || 1;

    const markingSetting = await MarkingSetting.findOne({}, {
      dailyExperience: 1,
      weeklyBonus: 1,
      monthlyBonus: 1,
      experiencePoint: 1,
      totalquiz: 1,
      totalnoofquestion: 1
    }).sort({ createdAt: -1 }).lean();

    const weeklyCount = currentStreak.count % 7 === 0 ? 7 : currentStreak.count % 7;
    const monthlyCount = currentStreak.count % 30 === 0 ? 30 : currentStreak.count % 30;
    const levelData = user?.userLevelData?.find((item) => item.level === level);
    const levelBonusPoint = levelData?.levelBonusPoint || 0;

    // --- Assigned Learnings with IQ ---
    let assignedLearnings = [];
    let classInfo = null;

    if (user?.className) {
      assignedLearnings = await Assigned.find({ classId: user.className })
        .populate('learning')
        .populate('learning2')
        .populate('learning3')
        .populate('learning4')
        .lean();

      for (let item of assignedLearnings) {
        const getIQScore = async (learningField) => {
          if (item[learningField]?._id) {
            const iqRecord = await GenralIQ.findOne({
              userId,
              learningId: item[learningField]._id,
              session
            }).lean();
            return iqRecord?.overallAverage ?? null;
          }
          return null;
        };

        if (!item.learning || Object.keys(item.learning).length === 0) item.learning = null;
        if (!item.learning2 || Object.keys(item.learning2).length === 0) item.learning2 = null;
        if (!item.learning3 || Object.keys(item.learning3).length === 0) item.learning3 = null;
        if (!item.learning4 || Object.keys(item.learning4).length === 0) item.learning4 = null;

        item.learningAverage = await getIQScore('learning');
        item.learning2Average = await getIQScore('learning2');
        item.learning3Average = await getIQScore('learning3');
        item.learning4Average = await getIQScore('learning4');
      }

      // Class info
      classInfo = await School.findById(user.className).lean();
      if (!classInfo) {
        classInfo = await College.findById(user.className).lean();
      }
    }

    // --- Practice Learnings + Quiz Count
    const totalQuiz = markingSetting?.totalquiz || 0;

    const practice = [];
    const seen = new Set();

    for (let item of assignedLearnings) {
      const fields = ['learning', 'learning2', 'learning3', 'learning4'];
      for (let field of fields) {
        const lrn = item[field];
        if (lrn && lrn._id && !seen.has(lrn._id.toString())) {
          seen.add(lrn._id.toString());
          practice.push({
            ...lrn,
            totalQuiz
          });
        }
      }
    }

    // --- Quotes
    const quotes = await Quotes.find({ Status: 'Published' }).lean();

    // --- Final Response
    return res.status(200).json({
      currentStreak,
      bonus: {
        bonuspoint,
        weekly: {
          count: weeklyCount,
          startDate: currentStreak.startDate,
          endDate: weeklyCount === 7 ? currentStreak.endDate : null
        },
        monthly: {
          count: monthlyCount,
          startDate: currentStreak.startDate,
          endDate: monthlyCount === 30 ? currentStreak.endDate : null
        },
        weeklyBonus: markingSetting?.weeklyBonus || 0,
        monthlyBonus: markingSetting?.monthlyBonus || 0
      },
      levelBonusPoint,
      experiencePoint: markingSetting?.experiencePoint || 0,
      totalNoOfQuestion: markingSetting?.totalnoofquestion || 0,
      totalQuiz: markingSetting?.totalquiz || 0,
      level,
      generalIq: assignedLearnings,
      assignedLearnings,
      practice,
      totalQuiz,
      classInfo,
      quotes
    });

  } catch (error) {
    console.error('Dashboard Error:', error);
    return res.status(500).json({ message: error.message });
  }
};



// exports.Dashboard = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     // --- Scores for Streak Calculation ---
//     const learningScores = await LearningScore.find({ userId, strickStatus: true }).lean();
//     const topicScores = await TopicScore.find({ userId, strickStatus: true }).lean();

//     const practiceDates = new Set(learningScores.map(s => moment(s.scoreDate).format('YYYY-MM-DD')));
//     const topicDates = new Set(topicScores.map(s => moment(s.updatedAt).format('YYYY-MM-DD')));
//     const commonDates = [...practiceDates].filter(date => topicDates.has(date)).sort();

//     // --- currentStreak Calculation ---
//     let currentStreak = { count: 0, startDate: null, endDate: null };
//     let streakStart = null;
//     let tempStreak = [];

//     for (let i = 0; i < commonDates.length; i++) {
//       const curr = moment(commonDates[i]);
//       const prev = i > 0 ? moment(commonDates[i - 1]) : null;

//       if (!prev || curr.diff(prev, 'days') === 1) {
//         if (!streakStart) streakStart = commonDates[i];
//         tempStreak.push(commonDates[i]);
//       } else {
//         tempStreak = [commonDates[i]];
//         streakStart = commonDates[i];
//       }
//     }

//     if (tempStreak.length > 0) {
//       currentStreak = {
//         count: tempStreak.length,
//         startDate: streakStart,
//         endDate: tempStreak[tempStreak.length - 1]
//       };
//     }

//     // --- User Info & Marking Settings ---
//     const user = await User.findById(userId).lean();
//     const bonuspoint = user?.bonuspoint || 0;
//     const level = user?.level || 1;

//     const markingSetting = await MarkingSetting.findOne({}, {
//       dailyExperience: 1,
//       weeklyBonus: 1,
//       monthlyBonus: 1,
//       experiencePoint: 1, 
//       totalquiz: 1,
//       totalnoofquestion: 1
//     }).sort({ createdAt: -1 }).lean();

//     const weeklyCount = currentStreak.count % 7 === 0 ? 7 : currentStreak.count % 7;
//     const monthlyCount = currentStreak.count % 30 === 0 ? 30 : currentStreak.count % 30;
//     const levelData = user?.userLevelData?.find((item) => item.level === level);
//     const levelBonusPoint = levelData?.levelBonusPoint || 0;

//     // --- Assigned Learnings with IQ ---
//     let assignedLearnings = [];
//     let classInfo = null;

//     if (user?.className) {
//       assignedLearnings = await Assigned.find({ classId: user.className })
//         .populate('learning')
//         .populate('learning2')
//         .populate('learning3')
//         .populate('learning4')
//         .lean();

//       for (let item of assignedLearnings) {
//         const getIQScore = async (learningField) => {
//           if (item[learningField]?._id) {
//             const iqRecord = await GenralIQ.findOne({
//               userId,
//               learningId: item[learningField]._id,
//             }).lean();
//             return iqRecord?.overallAverage ?? null;
//           }
//           return null;
//         };

//         if (!item.learning || Object.keys(item.learning).length === 0) item.learning = null;
//         if (!item.learning2 || Object.keys(item.learning2).length === 0) item.learning2 = null;
//         if (!item.learning3 || Object.keys(item.learning3).length === 0) item.learning3 = null;
//         if (!item.learning4 || Object.keys(item.learning4).length === 0) item.learning4 = null;

//         item.learningAverage = await getIQScore('learning');
//         item.learning2Average = await getIQScore('learning2');
//         item.learning3Average = await getIQScore('learning3');
//         item.learning4Average = await getIQScore('learning4');
//       }

//       // Class info from School or College
//       classInfo = await School.findById(user.className).lean();
//       if (!classInfo) {
//         classInfo = await College.findById(user.className).lean();
//       }
//     }

//     // --- Practice Learnings + Quiz Count ---
//     const totalQuiz = markingSetting?.totalquiz || 0;

//     const practice = [];
//     const seen = new Set();

//     for (let item of assignedLearnings) {
//       const fields = ['learning', 'learning2', 'learning3', 'learning4'];
//       for (let field of fields) {
//         const lrn = item[field];
//         if (lrn && lrn._id && !seen.has(lrn._id.toString())) {
//           seen.add(lrn._id.toString());
//           practice.push({
//             ...lrn,
//             totalQuiz
//           });
//         }
//       }
//     }

//     // --- Quotes with Status: Published ---
//     const quotes = await Quotes.find({ Status: 'Published' }).lean();

//     // --- Final Response ---
//     return res.status(200).json({
//       currentStreak,
//       bonus: {
//         bonuspoint,
//         weekly: {
//           count: weeklyCount,
//           startDate: currentStreak.startDate,
//           endDate: weeklyCount === 7 ? currentStreak.endDate : null
//         },
//         monthly: {
//           count: monthlyCount,
//           startDate: currentStreak.startDate,
//           endDate: monthlyCount === 30 ? currentStreak.endDate : null
//         },
//         weeklyBonus: markingSetting?.weeklyBonus || 0,
//         monthlyBonus: markingSetting?.monthlyBonus || 0
//       },
//       levelBonusPoint,
//       experiencePoint: markingSetting?.experiencePoint || 0,
//       totalNoOfQuestion: markingSetting?.totalnoofquestion || 0,
//       totalQuiz: markingSetting?.totalquiz || 0,
//       level,
//       generalIq: assignedLearnings, // each item contains learning1–4 + their IQ
//       assignedLearnings,
//       practice,
//       totalQuiz,
//       classInfo,
//       quotes
//     });

//   } catch (error) {
//     console.error('Dashboard Error:', error);
//     return res.status(500).json({ message: error.message });
//   }
// };