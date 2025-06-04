
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



exports.PracticeTest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { topicId, questionId, selectedAnswer, learningId } = req.body;

    if (!topicId || !questionId || !learningId) {
      return res.status(400).json({ message: 'topicId, questionId, and learningId are required.' });
    }

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
        isSkipped: !selectedAnswer
      });
    } else {
      const newAnswer = new PracticesQuizAnswer({
        userId,
        topicId,
        questionId,
        selectedAnswer: answerToSave,
        learningId,
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
      scoreDate: startOfDay
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
exports.TopicWithLeaningpractice = async (req, res) => {
  try {
    const { id } = req.params;
    const { classId: queryClassId } = req.query;
    const user = req.user;

    if (!user || user.status !== 'yes') {
      return res.status(403).json({ message: 'Access denied. Please complete your payment.' });
    }

    const registrationDate = moment(user.createdAt).startOf('day');
    const today = moment().startOf('day');
    const daysPassed = today.diff(registrationDate, 'days') + 1;

    const query = { learningId: new mongoose.Types.ObjectId(id) };
    if (queryClassId) {
      query.classId = new mongoose.Types.ObjectId(queryClassId);
    } else if (user.className) {
      query.classId = new mongoose.Types.ObjectId(user.className);
    }

    const learningData = await Learning.findById(id).select('name').lean();
    if (!learningData) {
      return res.status(404).json({ message: 'Learning not found.' });
    }

    const allTopics = await Topic.find(query)
      .sort({ createdAt: 1 })
      .select('topic score createdAt isdescription isvideo')
      .lean();

    if (!allTopics || allTopics.length === 0) {
      return res.status(404).json({ message: 'No topics found for this learningId or classId' });
    }

    // ✅ Fetch first score from LearningScore
    const firstScoreRecord = await LearningScore.findOne({
      userId: user._id,
      learningId: id
    }).sort({ createdAt: 1 }).lean();

    const score = firstScoreRecord ? firstScoreRecord.score : null;

    const unlockedTopics = allTopics.slice(0, daysPassed).map(topic => {
      if (topic.score === null || topic.score === undefined) {
        const { score, ...rest } = topic;
        return rest;
      }
      return topic;
    });

    res.status(200).json({
      learningName: learningData.name,
      score, 
      topics: unlockedTopics
    });

  } catch (error) {
    console.error('Error fetching topics with learningId:', error);
    res.status(500).json({ message: error.message });
  }
};


exports.PracticescoreCard = async (req, res) => {
  try {
    const user = req.user;

    if (!user || !user.className) {
      return res.status(400).json({ message: 'User class is missing.' });
    }

    const classId = new mongoose.Types.ObjectId(user.className);

    const topics = await LearningScore.find({
      classId,
      score: { $ne: null }
    })
      .sort({ createdAt: 1 }) // ✅ Sort by createdAt (first saved)
      .select('topic createdAt learningId score')
      .populate('learningId')
      .lean();

    if (!topics.length) {
      return res.status(404).json({ message: 'No scored topics found for this class.' });
    }

    const firstScoredTopicsPerDay = [];
    const seenDates = new Set();

    for (const topic of topics) {
      const dateKey = moment(topic.createdAt).format('YYYY-MM-DD'); // ✅ Use createdAt
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