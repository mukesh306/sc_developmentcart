
const mongoose = require('mongoose');
const Topic = require('../models/topic');
const Quiz = require('../models/quiz');
const School = require('../models/school');
const College = require('../models/college');
const moment = require('moment');
const Assigned = require('../models/assignlearning');  
const UserQuizAnswer = require('../models/userQuizAnswer');
const PracticesQuizAnswer = require('../models/practicestest');
const MarkingSetting = require('../models/markingSetting'); 
const Learning = require('../models/learning'); 
const LearningScore = require('../models/learningScore');
const TopicScore = require('../models/topicScore');
const User = require('../models/User');
const Experienceleavel = require('../models/expirenceLeavel'); 

// exports.PracticeTest = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { topicId, questionId, selectedAnswer, learningId } = req.body;

//     if (!topicId || !questionId || !learningId) {
//       return res.status(400).json({ message: 'topicId, questionId, and learningId are required.' });
//     }

//     // ✅ Get user's session and endDate
//     const user = await User.findById(userId).lean();
//     const userSession = user?.session;
//     const endDate = user?.endDate || null;

//     if (!userSession) {
//       return res.status(400).json({ message: 'User session not found.' });
//     }

//     // ✅ Verify quiz question exists
//     const quiz = await Quiz.findOne({ _id: questionId, topicId }).lean();
//     if (!quiz) {
//       return res.status(404).json({ message: 'Quiz question not found for the given topic.' });
//     }

//     const answerToSave = selectedAnswer ? selectedAnswer : null;

//     const startOfDay = moment().startOf('day').toDate();
//     const endOfDay = moment().endOf('day').toDate();

//     const existingAnswer = await PracticesQuizAnswer.findOne({
//       userId,
//       topicId,
//       questionId,
//       createdAt: { $gte: startOfDay, $lte: endOfDay }
//     });

//     if (existingAnswer) {
//       await PracticesQuizAnswer.findByIdAndUpdate(existingAnswer._id, {
//         selectedAnswer: answerToSave,
//         learningId,
//         session: userSession,
//         endDate,                         // ✅ Save endDate on update
//         isSkipped: !selectedAnswer
//       });
//     } else {
//       const newAnswer = new PracticesQuizAnswer({
//         userId,
//         topicId,
//         questionId,
//         selectedAnswer: answerToSave,
//         learningId,
//         session: userSession,
//         endDate,                         // ✅ Save endDate on insert
//         isSkipped: !selectedAnswer
//       });
//       await newAnswer.save();
//     }

//     const message = selectedAnswer ? 'Answer saved successfully.' : 'Question skipped and recorded.';
//     return res.status(200).json({ message });

//   } catch (error) {
//     console.error('Error in PracticeTest:', error);
//     return res.status(500).json({ message: error.message });
//   }
// };


exports.PracticeTest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { topicId, questionId, selectedAnswer, learningId } = req.body;

    if (!topicId || !questionId || !learningId) {
      return res.status(400).json({ message: 'topicId, questionId, and learningId are required.' });
    }

    // ✅ Get user data
    const user = await User.findById(userId).lean();
    const userSession = user?.session;
    const startDate = user?.startDate || null;
    const endDate = user?.endDate || null;
    const classId = user?.className || null;

    if (!userSession) {
      return res.status(400).json({ message: 'User session not found.' });
    }

    // ✅ Verify quiz question exists
    const quiz = await Quiz.findOne({ _id: questionId, topicId }).lean();
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz question not found for the given topic.' });
    }

    const answerToSave = selectedAnswer ? selectedAnswer : null;

    const startOfDay = moment().startOf('day').toDate();
    const endOfDay = moment().endOf('day').toDate();

    const existingAnswer = await PracticesQuizAnswer.findOne({
      userId,
      topicId,
      questionId,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    const answerPayload = {
      selectedAnswer: answerToSave,
      learningId,
      session: userSession,
      startDate,       // ✅ Save startDate from user
      endDate,         // ✅ Save endDate from user
      classId,         // ✅ Save className from user as classId
      isSkipped: !selectedAnswer
    };

    if (existingAnswer) {
      await PracticesQuizAnswer.findByIdAndUpdate(existingAnswer._id, answerPayload);
    } else {
      const newAnswer = new PracticesQuizAnswer({
        userId,
        topicId,
        questionId,
        ...answerPayload
      });
      await newAnswer.save();
    }

    const message = selectedAnswer ? 'Answer saved successfully.' : 'Question skipped and recorded.';
    return res.status(200).json({ message });

  } catch (error) {
    console.error('Error in PracticeTest:', error);
    return res.status(500).json({ message: error.message });
  }
};


// exports.calculateQuizScoreByLearning = async (req, res) => {
//   try { 
//     const userId = req.user._id;
//     const { learningId, topicTotalMarks, negativeMarking: inputNegativeMarking } = req.body;

//     if (!learningId) {
//       return res.status(400).json({ message: 'learningId is required.' });
//     }

//     const topics = await Topic.find({ learningId }).lean();
//     if (!topics.length) {
//       return res.status(404).json({ message: 'No topics found for this learning.' });
//     }

//     const topicIds = topics.map(t => t._id.toString());

//     const markingSetting = await MarkingSetting.findOne().sort({ createdAt: -1 }).lean();
//     const negativeMarking = (typeof inputNegativeMarking === 'number')
//       ? inputNegativeMarking
//       : (markingSetting?.negativeMarking || 0);

//     const now = new Date();
//     const startOfDay = new Date(now.setHours(0, 0, 0, 0));
//     const endOfDay = new Date(now.setHours(23, 59, 59, 999));

//     const answers = await PracticesQuizAnswer.find({
//       userId,
//       learningId,
//       topicId: { $in: topicIds },
//       createdAt: { $gte: startOfDay, $lte: endOfDay }
//     });

//     if (!answers.length) {
//       return res.status(400).json({ message: 'No answers submitted today for this learning.' });
//     }

//     const user = await User.findById(userId).lean();
//     const userSession = user?.session || null;
//     const userClassId = user?.className || null; // ✅ get classId

//     const answeredQuestionIds = answers.map(ans => ans.questionId.toString());
//     const answeredQuizzes = await Quiz.find({ _id: { $in: answeredQuestionIds } }).lean();

//     const totalQuestions = answers.length;
//     const maxMarkPerQuestion = (typeof topicTotalMarks === 'number' && topicTotalMarks > 0)
//       ? topicTotalMarks / totalQuestions
//       : (markingSetting?.maxMarkPerQuestion || 1);

//     const totalMarks = maxMarkPerQuestion * totalQuestions;

//     let correctCount = 0;
//     let incorrectCount = 0;
//     let skippedCount = 0;

//     for (const answer of answers) {
//       const quiz = answeredQuizzes.find(q => q._id.toString() === answer.questionId.toString());
//       if (!quiz) continue;

//       if (answer.selectedAnswer === null || answer.selectedAnswer === undefined) {
//         skippedCount++;
//       } else if (answer.selectedAnswer === quiz.answer) {
//         correctCount++;
//       } else {
//         incorrectCount++;
//       }
//     }

//     const answeredQuestions = correctCount + incorrectCount;
//     const skippedQuestions = skippedCount;

//     const positiveMarks = correctCount * maxMarkPerQuestion;
//     const negativeMarks = incorrectCount * negativeMarking;

//     let marksObtained = positiveMarks - negativeMarks;
//     if (marksObtained < 0) marksObtained = 0;

//     const roundedMarks = parseFloat(marksObtained.toFixed(2));
//     const scorePercent = (roundedMarks / totalMarks) * 100;
//     const roundedScorePercent = parseFloat(scorePercent.toFixed(2));

//     const existingScore = await LearningScore.findOne({
//       userId,
//       learningId,
//       session: userSession,
//       scoreDate: { $gte: startOfDay, $lte: endOfDay }
//     });

//     const scoreData = {
//       userId,
//       learningId,
//       score: roundedScorePercent,
//       totalQuestions,
//       answeredQuestions,
//       correctAnswers: correctCount,
//       incorrectAnswers: incorrectCount,
//       skippedQuestions,
//       marksObtained: roundedMarks,
//       totalMarks,
//       maxMarkPerQuestion,
//       negativeMarking,
//       scorePercent: roundedScorePercent,
//       scoreDate: startOfDay,
//       session: userSession,
//       classId: userClassId // ✅ added classId here
//     };

//     if (!existingScore) {
//       const newScore = new LearningScore({ ...scoreData, strickStatus: true });
//       await newScore.save();

//       return res.status(200).json({
//         message: 'Score calculated and saved for today.',
//         ...scoreData,
//         strickStatus: true,
//         saved: true
//       });
//     } else {
//       return res.status(200).json({
//         message: 'Score already submitted today. New score calculated but not saved.',
//         ...scoreData,
//         saved: false
//       });
//     }
//   } catch (error) {
//     console.error('Error in calculateQuizScoreByLearning:', error);
//     res.status(500).json({ message: error.message });
//   }
// };


exports.calculateQuizScoreByLearning = async (req, res) => {
  try { 
    const userId = req.user._id;
    const { learningId, topicTotalMarks, negativeMarking: inputNegativeMarking } = req.body;

    if (!learningId) {
      return res.status(400).json({ message: 'learningId is required.' });
    }

    const topics = await Topic.find({ learningId }).lean();
    if (!topics.length) {
      return res.status(404).json({ message: 'No topics found for this learning.' });
    }

    const topicIds = topics.map(t => t._id.toString());

    const markingSetting = await MarkingSetting.findOne().sort({ createdAt: -1 }).lean();
    const negativeMarking = (typeof inputNegativeMarking === 'number')
      ? inputNegativeMarking
      : (markingSetting?.negativeMarking || 0);

    const now = new Date();
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));
    const endOfDay = new Date(now.setHours(23, 59, 59, 999));

    const answers = await PracticesQuizAnswer.find({
      userId,
      learningId,
      topicId: { $in: topicIds },
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    if (!answers.length) {
      return res.status(400).json({ message: 'No answers submitted today for this learning.' });
    }

    const user = await User.findById(userId).lean();
    const userSession = user?.session || null;
    const userClassId = user?.className || null;
    const startDate = user?.startDate || null; // ✅ Added
    const endDate = user?.endDate || null;     // ✅ Added

    const answeredQuestionIds = answers.map(ans => ans.questionId.toString());
    const answeredQuizzes = await Quiz.find({ _id: { $in: answeredQuestionIds } }).lean();

    const totalQuestions = answers.length;
    const maxMarkPerQuestion = (typeof topicTotalMarks === 'number' && topicTotalMarks > 0)
      ? topicTotalMarks / totalQuestions
      : (markingSetting?.maxMarkPerQuestion || 1);

    const totalMarks = maxMarkPerQuestion * totalQuestions;

    let correctCount = 0;
    let incorrectCount = 0;
    let skippedCount = 0;

    for (const answer of answers) {
      const quiz = answeredQuizzes.find(q => q._id.toString() === answer.questionId.toString());
      if (!quiz) continue;

      if (answer.selectedAnswer === null || answer.selectedAnswer === undefined) {
        skippedCount++;
      } else if (answer.selectedAnswer === quiz.answer) {
        correctCount++;
      } else {
        incorrectCount++;
      }
    }

    const answeredQuestions = correctCount + incorrectCount;
    const skippedQuestions = skippedCount;

    const positiveMarks = correctCount * maxMarkPerQuestion;
    const negativeMarks = incorrectCount * negativeMarking;

    let marksObtained = positiveMarks - negativeMarks;
    if (marksObtained < 0) marksObtained = 0;

    const roundedMarks = parseFloat(marksObtained.toFixed(2));
    const scorePercent = (roundedMarks / totalMarks) * 100;
    const roundedScorePercent = parseFloat(scorePercent.toFixed(2));

    const existingScore = await LearningScore.findOne({
      userId,
      learningId,
      session: userSession,
      scoreDate: { $gte: startOfDay, $lte: endOfDay }
    });

    const scoreData = {
      userId,
      learningId,
      score: roundedScorePercent,
      totalQuestions,
      answeredQuestions,
      correctAnswers: correctCount,
      incorrectAnswers: incorrectCount,
      skippedQuestions,
      marksObtained: roundedMarks,
      totalMarks,
      maxMarkPerQuestion,
      negativeMarking,
      scorePercent: roundedScorePercent,
      scoreDate: startOfDay,
      session: userSession,
      classId: userClassId,
      startDate,  // ✅ Added
      endDate     // ✅ Added
    };

    if (!existingScore) {
      const newScore = new LearningScore({ ...scoreData, strickStatus: true });
      await newScore.save();

      return res.status(200).json({
        message: 'Score calculated and saved for today.',
        ...scoreData,
        strickStatus: true,
        saved: true
      });
    } else {
      return res.status(200).json({
        message: 'Score already submitted today. New score calculated but not saved.',
        ...scoreData,
        saved: false
      });
    }
  } catch (error) {
    console.error('Error in calculateQuizScoreByLearning:', error);
    res.status(500).json({ message: error.message });
  }
};


exports.getAssignedListUserpractice = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).lean();
    if (!user || !user.className || !user.session) {
      return res.status(400).json({ message: 'User className or session not found.' });
    }

    // STEP 1: Get only first score of each day (for all learningIds together)
    const dailyFirstScores = await LearningScore.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          session: user.session,
          classId: user.className.toString() // ✅ Match classId with user.className
        }
      },
      { $sort: { scoreDate: 1, createdAt: 1 } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$scoreDate" } }
          },
          doc: { $first: "$$ROOT" } // only one entry per day
        }
      },
      { $replaceRoot: { newRoot: "$doc" } },
    ]);

    // STEP 2: Group those by learningId and calculate average
    const grouped = {};
    for (let s of dailyFirstScores) {
      if (!s.learningId) continue;
      const lid = s.learningId.toString();
      if (!grouped[lid]) grouped[lid] = [];
      grouped[lid].push(s.score);
    }

    const averageScoreMap = {};
    for (const lid in grouped) {
      const arr = grouped[lid];
      const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
      averageScoreMap[lid] = parseFloat(avg.toFixed(2));
    }

    // STEP 3: Get assigned list and attach calculated averages
    const assignedList = await Assigned.find({ classId: user.className })
      .populate('learning')
      .populate('learning2')
      .populate('learning3')
      .populate('learning4')
      .lean();

    for (let item of assignedList) {
      let classInfo = await School.findById(item.classId).lean();
      if (!classInfo) {
        classInfo = await College.findById(item.classId).lean();
      }
      item.classInfo = classInfo || null;

      const getAverage = (learningObj) => {
        if (learningObj && learningObj._id) {
          const lid = learningObj._id.toString();
          return Object.prototype.hasOwnProperty.call(averageScoreMap, lid)
            ? averageScoreMap[lid]
            : 0;
        }
        return 0;
      };

      ['learning', 'learning2', 'learning3', 'learning4'].forEach(field => {
        if (!item[field] || Object.keys(item[field]).length === 0) {
          item[field] = null;
        }
      });

      item.learningAverage = getAverage(item.learning);
      item.learning2Average = getAverage(item.learning2);
      item.learning3Average = getAverage(item.learning3);
      item.learning4Average = getAverage(item.learning4);
    }

    // Final response
    res.status(200).json({ data: assignedList });

  } catch (error) {
    console.error('Get Assigned Practice Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};


// exports.getAssignedListUserpractice = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const user = await User.findById(userId).lean();
//     if (!user || !user.className) {
//       return res.status(400).json({ message: 'User className not found.' });
//     }

//     // STEP 1: Get only first score of each day (for all learningIds together)
//     const dailyFirstScores = await LearningScore.aggregate([
//       {
//         $match: {
//           userId: new mongoose.Types.ObjectId(userId),
//           classId: user.className.toString() // ✅ Match classId with user.className
//         }
//       },
//       { $sort: { scoreDate: 1, createdAt: 1 } },
//       {
//         $group: {
//           _id: {
//             date: { $dateToString: { format: "%Y-%m-%d", date: "$scoreDate" } }
//           },
//           doc: { $first: "$$ROOT" } // only one entry per day
//         }
//       },
//       { $replaceRoot: { newRoot: "$doc" } },
//     ]);

//     // STEP 2: Group those by learningId and calculate average
//     const grouped = {};
//     for (let s of dailyFirstScores) {
//       if (!s.learningId) continue;
//       const lid = s.learningId.toString();
//       if (!grouped[lid]) grouped[lid] = [];
//       grouped[lid].push(s.score);
//     }

//     const averageScoreMap = {};
//     for (const lid in grouped) {
//       const arr = grouped[lid];
//       const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
//       averageScoreMap[lid] = parseFloat(avg.toFixed(2));
//     }

//     // STEP 3: Get assigned list and filter out expired by endDate
//     const today = new Date();
//     const allAssigned = await Assigned.find({ classId: user.className })
//       .populate('learning')
//       .populate('learning2')
//       .populate('learning3')
//       .populate('learning4')
//       .lean();

//     const assignedList = allAssigned.filter(item => {
//       if (!item.endDate) return true; // keep if no endDate
//       const [day, month, year] = item.endDate.split('-');
//       const endDate = new Date(`${year}-${month}-${day}T23:59:59`);
//       return endDate >= today;
//     });

//     // STEP 4: Attach average scores
//     for (let item of assignedList) {
//       let classInfo = await School.findById(item.classId).lean();
//       if (!classInfo) {
//         classInfo = await College.findById(item.classId).lean();
//       }
//       item.classInfo = classInfo || null;

//       const getAverage = (learningObj) => {
//         if (learningObj && learningObj._id) {
//           const lid = learningObj._id.toString();
//           return Object.prototype.hasOwnProperty.call(averageScoreMap, lid)
//             ? averageScoreMap[lid]
//             : 0;
//         }
//         return 0;
//       };

//       ['learning', 'learning2', 'learning3', 'learning4'].forEach(field => {
//         if (!item[field] || Object.keys(item[field]).length === 0) {
//           item[field] = null;
//         }
//       });

//       item.learningAverage = getAverage(item.learning);
//       item.learning2Average = getAverage(item.learning2);
//       item.learning3Average = getAverage(item.learning3);
//       item.learning4Average = getAverage(item.learning4);
//     }

//     // Final response
//     res.status(200).json({ data: assignedList });

//   } catch (error) {
//     console.error('Get Assigned Practice Error:', error);
//     res.status(500).json({ message: 'Internal server error', error: error.message });
//   }
// };

exports.platformDetails = async (req, res) => {
  try {
    const userId = req.params.id; 
    const requestedLevel = parseInt(req.query.level || 0); 

    if (!userId) {
      return res.status(400).json({ message: 'userId is required.' });
    }

    const user = await User.findById(userId).lean();
    if (!user?.session || !user?.className) {
      return res.status(400).json({ message: 'User session or className not found.' });
    }

    const session = user.session;
    const classId = user.className.toString();

    const scores = await LearningScore.find({
      userId,
      session,
      classId,
      strickStatus: true
    }).populate('learningId', 'name')
      .sort({ scoreDate: 1 })
      .lean();

    const topicScores = await TopicScore.find({
      userId,
      session,
      classId,
      strickStatus: true
    }).populate('learningId', 'name')
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
      const isToday = currentDate === moment().format('YYYY-MM-DD');
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

        result.push(item);
      } else {
        if (!isToday) {
          item.deduction = deductions;
          if (!existingDeductedDates.includes(currentDate)) {
            deductionToSubtract += deductions;
            datesToDeduct.push(currentDate);
          }
          result.push(item);
        }
      }
    }

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

    const updatedUser = await User.findById(userId).select('bonuspoint userLevelData session className').lean();
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

    const existingExp = await Experienceleavel.findOne({ userId, session, classId });
    if (existingExp) {
      await Experienceleavel.findByIdAndUpdate(existingExp._id, {
        $set: { levelBonusPoint, session, classId }
      });
    } else {
      await Experienceleavel.create({
        userId,
        levelBonusPoint,
        session,
        classId
      });
    }

    let matched = requestedLevel && requestedLevel !== newLevel
      ? updatedUser.userLevelData.find(l => l.level === requestedLevel)?.data || []
      : result;

    if (matched.length > 1) {
      const latest = matched[matched.length - 1];
      const rest = matched.slice(0, -1).sort((a, b) => new Date(a.date) - new Date(b.date));
      matched = [latest, ...rest];
    }

    const roundedBonusPoint = Math.round(updatedUser?.bonuspoint || 0);
    const roundedLevelBonusPoint = Math.round(levelBonusPoint);

    return res.status(200).json({
      bonuspoint: roundedBonusPoint,
      levelBonusPoint: roundedLevelBonusPoint,
      experiencePoint,
      level: newLevel,
      dates: matched
    });

  } catch (error) {
    console.error('StrikePath error:', error);
    return res.status(500).json({ message: error.message });
  }
};

const getLevelFromPoints = async (points) => {
  const setting = await MarkingSetting.findOne({}).sort({ updatedAt: -1 }).lean();
  const experiencePoint = setting?.experiencePoint || 1000;
  if (points < experiencePoint) return 1;
  return Math.floor(points / experiencePoint) + 1;
};