
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
const UserHistory = require('../models/UserHistory');

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
    const endTime = user?.endTime || null;     // ✅ Added

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
      startDate,  
      endDate,  
      endTime 
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


// exports.getAssignedListUserpractice = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const user = await User.findById(userId).lean();
//     if (!user || !user.className || !user.endDate) {
//       return res.status(400).json({ message: 'Please complete your profile.' });
//     }

//     const userEndDate = user.endDate;
//     const userClassId = user.className.toString();

//     // STEP 1: Get only first score of each day (for all learningIds together)
//     const dailyFirstScores = await LearningScore.aggregate([
//       {
//         $match: {
//           userId: new mongoose.Types.ObjectId(userId),
//           endDate: userEndDate, // ⬅️ Replaced session
//           classId: userClassId
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

//     // STEP 3: Get assigned list and attach calculated averages
//     const assignedList = await Assigned.find({ classId: user.className })
//       .populate('learning')
//       .populate('learning2')
//       .populate('learning3')
//       .populate('learning4')
//       .lean();

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

exports.getAssignedListUserpractice = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).lean();

    if (!user?.endDate || !user?.className) {
      return res.status(200).json({
        enrolledDate: user?.updatedAt
          ? moment(user.updatedAt).format('YYYY-MM-DD')
          : null,
        currentDate: moment().format('YYYY-MM-DD'),
        updatedAt: user?.updatedAt
          ? moment(user.updatedAt).format('YYYY-MM-DD')
          : null,
        data: []
      });
    }

    const userEndDate = user.endDate;
    const userClassId = user.className.toString();

   
    const dailyFirstScores = await LearningScore.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          endDate: userEndDate,
          classId: userClassId
        }
      },
      { $sort: { scoreDate: 1, createdAt: 1 } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$scoreDate" } }
          },
          doc: { $first: "$$ROOT" }
        }
      },
      { $replaceRoot: { newRoot: "$doc" } }
    ]);

   
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

    
    res.status(200).json({
      enrolledDate: user.updatedAt
        ? moment(user.updatedAt).format('YYYY-MM-DD')
        : null,
      currentDate: moment().format('YYYY-MM-DD'),
      updatedAt: user.updatedAt
        ? moment(user.updatedAt).format('YYYY-MM-DD')
        : null,
      data: assignedList
    });

  } catch (error) {
    console.error('Get Assigned Practice Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};


exports.platformDetails = async (req, res) => {
  try {
    const userId = req.params.id;
    const { endDate } = req.query;
    const requestedLevel = parseInt(req.query.level || 0);

    if (!userId || !endDate) {
      return res.status(400).json({ message: 'userId and endDate are required.' });
    }

    // User ya UserHistory se user data fetch karo + populate
    let user = await User.findOne({ _id: userId, endDate })
      .populate('countryId', 'name')
      .populate('stateId', 'name')
      .populate('cityId', 'name')
      .populate({
        path: 'updatedBy',
        select: 'email session startDate endDate endTime name role'
      })
      .lean();

    if (!user) {
      user = await UserHistory.findOne({ originalUserId: userId, endDate })
        .populate('countryId', 'name')
        .populate('stateId', 'name')
        .populate('cityId', 'name')
        .populate({
          path: 'updatedBy',
          select: 'email session startDate endDate endTime name role'
        })
        .lean();
    }

    if (!user) {
      return res.status(404).json({ message: 'User with given endDate not found.' });
    }

    // ❌ Remove unwanted fields from user
    const { level, bonuspoint, userLevelData, ...filteredUser } = user;

    // Class details (School / College)
    let classId = user.className;
    let classDetails = null;
    if (mongoose.Types.ObjectId.isValid(classId)) {
      classDetails =
        (await School.findById(classId)) ||
        (await College.findById(classId));
    }

    // MarkingSetting
    const markingSetting = await MarkingSetting.findOne({}).lean();
    const experiencePoint = markingSetting?.experiencePoint || 0;

    // Requested level logic
    let matchedLevelData;
    if (requestedLevel) {
      matchedLevelData = userLevelData?.find(l => l.level === requestedLevel);
      if (!matchedLevelData) {
        return res.status(200).json({
          user: {
            ...filteredUser,
            country: user.countryId?.name || '',
            state: user.stateId?.name || '',
            city: user.cityId?.name || '',
            institutionName: user.schoolName || user.collegeName || user.instituteName || '',
            institutionType: user.studentType || '',
            classOrYear: classDetails?.name || ''
          },
          bonuspoint: 0,
          levelBonusPoint: 0,
          experiencePoint,
          level: requestedLevel,
          dates: []
        });
      }
    } else {
      matchedLevelData = userLevelData?.find(l => l.level === level);
      if (!matchedLevelData) {
        matchedLevelData = userLevelData?.[0];
      }
    }

    // ✅ Final formatted response
    return res.status(200).json({
      user: {
        ...filteredUser,
        country: user.countryId?.name || '',
        state: user.stateId?.name || '',
        city: user.cityId?.name || '',
        institutionName: user.schoolName || user.collegeName || user.instituteName || '',
        institutionType: user.studentType || '',
        classOrYear: classDetails?.name || ''
      },
      bonuspoint: Math.round(bonuspoint || 0),
      levelBonusPoint: Math.round(matchedLevelData?.levelBonusPoint || 0),
      experiencePoint,
      level: matchedLevelData?.level || level || 1,
      dates: matchedLevelData?.data || []
    });

  } catch (error) {
    console.error('platformDetails error:', error);
    return res.status(500).json({ message: error.message });
  }
};




// exports.platformDetails = async (req, res) => {
//   try {
//     const userId = req.params.id;
//     const { endDate } = req.query;
//     const requestedLevel = parseInt(req.query.level || 0);

//     if (!userId || !endDate) {
//       return res.status(400).json({ message: 'userId and endDate are required.' });
//     }

//     // User ya UserHistory se user data fetch karo
//     let user = await User.findOne({ _id: userId, endDate }).lean();

//     if (!user) {
//       user = await UserHistory.findOne({ originalUserId: userId, endDate }).lean();
//     }

//     if (!user) {
//       return res.status(404).json({ message: 'User with given endDate not found.' });
//     }

//     // MarkingSetting se bina filter ke first record lo (sabke liye common experiencePoint)
//     const markingSetting = await MarkingSetting.findOne({}).lean();
//     const experiencePoint = markingSetting?.experiencePoint || 0;

//     // Requested level ke basis pe ya user.level ke basis pe matched level data dhundo
//     let matchedLevelData;
//     if (requestedLevel) {
//       matchedLevelData = user.userLevelData?.find(l => l.level === requestedLevel);
//       if (!matchedLevelData) {
//         // Requested level ka data nahi mila to empty response bhejo experiencePoint ke sath
//         return res.status(200).json({
//           bonuspoint: 0,
//           levelBonusPoint: 0,
//           experiencePoint,
//           level: requestedLevel,
//           dates: []
//         });
//       }
//     } else {
//       matchedLevelData = user.userLevelData?.find(l => l.level === user.level);
//       if (!matchedLevelData) {
//         matchedLevelData = user.userLevelData?.[0];
//       }
//     }

//     // Final response bhejo
//     return res.status(200).json({
//       bonuspoint: Math.round(user?.bonuspoint || 0),
//       levelBonusPoint: Math.round(matchedLevelData?.levelBonusPoint || 0),
//       experiencePoint,
//       level: matchedLevelData?.level || user.level || 1,
//       dates: matchedLevelData?.data || []
//     });

//   } catch (error) {
//     console.error('platformDetails error:', error);
//     return res.status(500).json({ message: error.message });
//   }
// };

