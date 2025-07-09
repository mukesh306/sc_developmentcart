
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
const User = require('../models/User');


// exports.PracticeTest = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { topicId, questionId, selectedAnswer, learningId } = req.body;

//     if (!topicId || !questionId || !learningId) {
//       return res.status(400).json({ message: 'topicId, questionId, and learningId are required.' });
//     }

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
//         isSkipped: !selectedAnswer
//       });
//     } else {
//       const newAnswer = new PracticesQuizAnswer({
//         userId,
//         topicId,
//         questionId,
//         selectedAnswer: answerToSave,
//         learningId,
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

    // ✅ Get user's session
    const user = await User.findById(userId).lean();
    const userSession = user?.session;
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

    if (existingAnswer) {
      await PracticesQuizAnswer.findByIdAndUpdate(existingAnswer._id, {
        selectedAnswer: answerToSave,
        learningId,
        session: userSession,              // ✅ Save session on update
        isSkipped: !selectedAnswer
      });
    } else {
      const newAnswer = new PracticesQuizAnswer({
        userId,
        topicId,
        questionId,
        selectedAnswer: answerToSave,
        learningId,
        session: userSession,              // ✅ Save session on insert
        isSkipped: !selectedAnswer
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
//       scoreDate: startOfDay
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
      session: userSession, // 🆕 Also check session
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
      session: userSession // 🆕 Store session
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
//     if (!user || !user.className) {
//       return res.status(400).json({ message: 'User className not found.' });
//     }
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
//       const getScore = async (learningField) => {
//         if (item[learningField]?._id) {
//           const learningScore = await LearningScore.findOne({
//             userId: userId,
//             learningId: item[learningField]._id,
//           }).sort({ createdAt: 1 }).lean();

//           return learningScore?.score ?? null;
//         }
//         return null;
//       };
//       if (!item.learning || Object.keys(item.learning).length === 0) item.learning = null;
//       if (!item.learning2 || Object.keys(item.learning2).length === 0) item.learning2 = null;
//       if (!item.learning3 || Object.keys(item.learning3).length === 0) item.learning3 = null;
//       if (!item.learning4 || Object.keys(item.learning4).length === 0) item.learning4 = null;
//       item.learningAverage = await getScore('learning');
//       item.learning2Average = await getScore('learning2');
//       item.learning3Average = await getScore('learning3');
//       item.learning4Average = await getScore('learning4');
//     }
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
      // Populate class info from School or College
      let classInfo = await School.findById(item.classId).lean();
      if (!classInfo) {
        classInfo = await College.findById(item.classId).lean();
      }
      item.classInfo = classInfo || null;

      const getScore = async (learningField) => {
        const learning = item[learningField];
        if (learning && learning._id) {
          const learningScore = await LearningScore.findOne({
            userId,
            learningId: learning._id,
            session: user.session   // ✅ Filter by user session
          }).sort({ createdAt: 1 }).lean();

          return learningScore?.score ?? 0; // Return 0 if no score
        }
        return 0;
      };

      // Clean empty learning fields
      ['learning', 'learning2', 'learning3', 'learning4'].forEach(field => {
        if (!item[field] || Object.keys(item[field]).length === 0) {
          item[field] = null;
        }
      });

      // Attach scores by learning and session
      item.learningAverage = await getScore('learning');
      item.learning2Average = await getScore('learning2');
      item.learning3Average = await getScore('learning3');
      item.learning4Average = await getScore('learning4');
    }

    res.status(200).json({ data: assignedList });
  } catch (error) {
    console.error('Get Assigned Practice Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

