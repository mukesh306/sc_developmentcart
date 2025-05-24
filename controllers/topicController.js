
// exports.TopicWithLeaning = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { classId } = req.query;
//     const user = req.user;

//     if (!user || user.status !== 'yes') {
//       return res.status(403).json({ message: 'Access denied. Please complete your payment.' });
//     }
//     const registrationDate = moment(user.createdAt).startOf('day');
//     const today = moment().startOf('day');
//     const daysPassed = today.diff(registrationDate, 'days') + 1;

//     const query = { learningId: id };
//     if (classId) {
//       query.classId = classId;
//     }

//     const allTopics = await Topic.find(query)
//       .sort({ createdAt: 1 }) 
//       .select('topic score createdAt')
//       .lean();

//     if (!allTopics || allTopics.length === 0) {
//       return res.status(404).json({ message: 'No topics found for this learningId' });
//     }
//     const unlockedTopics = allTopics.slice(0, daysPassed).map(topic => {
//       if (topic.score === null) {
//         const { score, ...rest } = topic;
//         return rest;
//       }
//       return topic;
//     });

//     res.status(200).json({ topics: unlockedTopics });

//   } catch (error) {
//     console.error('Error fetching topics with learningId:', error);
//     res.status(500).json({ message: error.message });
//   }
// };

const mongoose = require('mongoose');
const Topic = require('../models/topic');
const Quiz = require('../models/quiz');
const School = require('../models/school');
const College = require('../models/college');
const moment = require('moment');
const Assigned = require('../models/assignlearning');  
const UserQuizAnswer = require('../models/userQuizAnswer');

exports.createTopicWithQuiz = async (req, res) => {
  try {
    const {
      classId,
      learningId,
      topic,
      testTime,
      videoTime,
      description
    } = req.body;

    const createdBy = req.user._id;
    const image = req.files?.image?.[0]?.path || null;

    const videoFile = req.files?.video?.[0]?.path || null;
    const videoLink = req.body.video || null;

    if (videoFile && videoLink) {
      return res.status(400).json({
        message: 'Please provide either a video file or a video link, not both.'
      });
    }

    const video = videoFile || videoLink || null;

    const newTopic = new Topic({
      classId,
      learningId,
      topic,
      testTime,
      videoTime,
      description,
      image,
      video,        
      createdBy
    });

    const savedTopic = await newTopic.save();

    let quizQuestions = [];

    if (req.body.quizQuestions) {
      try {
        quizQuestions = JSON.parse(req.body.quizQuestions);
      } catch (err) {
        return res.status(400).json({ message: 'Invalid quizQuestions format. Must be a valid JSON array.' });
      }
    }

    if (Array.isArray(quizQuestions) && quizQuestions.length > 0) {
      const quizData = quizQuestions.map((q) => ({
        topicId: savedTopic._id,
        question: q.question,
        option1: q.option1,
        option2: q.option2,
        option3: q.option3,
        option4: q.option4,
        answer: q.answer,
        createdBy
      }));

      await Quiz.insertMany(quizData);
    }

    res.status(201).json({
      message: 'Topic and quiz saved successfully',
      topicId: savedTopic._id
    });
  } catch (error) {
    console.error('Error saving topic and quiz:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.addQuizToTopic = async (req, res) => {
  try {
    const { topicId, quizQuestions } = req.body;
    if (!topicId) return res.status(400).json({ message: "Topic ID is required" });
    if (!Array.isArray(quizQuestions) || quizQuestions.length === 0) {
      return res.status(400).json({ message: "At least one quiz question is required" });
    }
    const quizData = quizQuestions.map((q) => ({
      topicId,
      question: q.question,
      option1: q.option1,
      option2: q.option2,
      option3: q.option3,
      option4: q.option4,
      answer: q.answer,
      createdBy: req.user.id 
    }));
    await Quiz.insertMany(quizData)
    res.status(201).json({ message: 'Quiz questions added to topic successfully' });
  } catch (error) {
    console.error('Add quiz error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getAllTopicsWithQuizzes = async (req, res) => {
  try {
    const topics = await Topic.find()
      .populate('learningId') 
      .lean(); 
    for (let item of topics) {
      let classInfo = await School.findById(item.classId).lean();
      if (!classInfo) {
        classInfo = await College.findById(item.classId).lean();
      }
      item.classInfo = classInfo || null; 
    }
    const topicIds = topics.map((t) => t._id);
    const quizzes = await Quiz.find({ topicId: { $in: topicIds } }).select('-__v');
    const quizzesByTopic = {};
    quizzes.forEach((quiz) => {
      const id = quiz.topicId.toString();
      if (!quizzesByTopic[id]) {
        quizzesByTopic[id] = [];
      }
      quizzesByTopic[id].push(quiz);
    });

    const result = topics.map((topic) => ({
      ...topic,
      quizzes: quizzesByTopic[topic._id.toString()] || []
    }));

    res.status(200).json({ topics: result }); 
  } catch (error) {
    console.error('Error fetching all topics with quizzes:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getTopicWithQuizById = async (req, res) => {
  try {
    const { topicId } = req.params;
    const topic = await Topic.findById(topicId)
      .populate('learningId')
      .lean();
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found' });
    }
    const quizzes = await Quiz.find({ topicId: topicId }).select('-__v');
    let classInfo = await School.findById(topic.classId).lean();
    if (!classInfo) {
      classInfo = await College.findById(topic.classId).lean();
    }
    topic.classInfo = classInfo || null;
    res.status(200).json({
      topic,
      quizzes
    });
  } catch (error) {
    console.error('Error fetching topic with quiz by topicId:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getAllTopicNames = async (req, res) => {
  try {
    const topics = await Topic.find()
      .select('topic') 
      .lean();

    res.status(200).json({ topics });
  } catch (error) {
    console.error('Error fetching topic names:', error);
    res.status(500).json({ message: error.message });
  }
};


exports.TopicWithLeaning = async (req, res) => {
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

    const allTopics = await Topic.find(query)
      .sort({ createdAt: 1 })
      .select('topic score createdAt isdescription isvideo')
      .lean();
    if (!allTopics || allTopics.length === 0) {
      return res.status(404).json({ message: 'No topics found for this learningId or classId' });
    }
    const validScores = allTopics
      .map(topic => parseFloat(topic.score))
      .filter(score => !isNaN(score));
    const averageScore =
      validScores.length > 0
        ? parseFloat((validScores.reduce((acc, val) => acc + val, 0) / validScores.length).toFixed(2))
        : null;
    const assignedRecord = await Assigned.findOne({
      classId: query.classId
    });
    if (assignedRecord) {  
      if (assignedRecord.learning?.toString() === id) {
        assignedRecord.learningAverage = averageScore;
      } else if (assignedRecord.learning2?.toString() === id) {
        assignedRecord.learning2Average = averageScore;
      } else if (assignedRecord.learning3?.toString() === id) {
        assignedRecord.learning3Average = averageScore;
      } else if (assignedRecord.learning4?.toString() === id) {
        assignedRecord.learning4Average = averageScore;
      }
      await assignedRecord.save();
    }
    const unlockedTopics = allTopics.slice(0, daysPassed).map(topic => {
      if (topic.score === null || topic.score === undefined) {
        const { score, ...rest } = topic;
        return rest;
      }
      return topic;
    });

    res.status(200).json({
      averageScore,
      topics: unlockedTopics
    });

  } catch (error) {
    console.error('Error fetching topics with learningId:', error);
    res.status(500).json({ message: error.message });
  }
};




// exports.TopicWithLeaning = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { classId } = req.query;
//     const query = { learningId: id };
//     if (classId) {
//       query.classId = classId;
//     }
//     const topics = await Topic.find(query)
//       .select('topic score') 
//       .lean();
//     if (!topics || topics.length === 0) {
//       return res.status(404).json({ message: 'No topics found for this learningId' });
//     }
//     res.status(200).json({ topics });
//   } catch (error) {
//     console.error('Error fetching topics with learningId:', error);
//     res.status(500).json({ message: error.message });
//   }
// };



exports.getTopicById = async (req, res) => {
  try {
    const { id } = req.params;
    const { isvideo, isdescription } = req.query;

    let topic = await Topic.findById(id)
      .populate('learningId')
      .populate('createdBy', 'email');
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found.' });
    }

    let updated = false;

    if (isvideo !== undefined) {
      topic.isvideo = isvideo === 'true' ? 'true' : 'false';
      updated = true;
    }

    if (isdescription !== undefined) {
      topic.isdescription = isdescription === 'true' ? 'true' : 'false';
      updated = true;
    }

    if (updated) {
      await topic.save(); 
    }
      const topicObj = topic.toObject(); 
 
    topicObj.testTimeInSeconds = topic.testTime ? topic.testTime * 60 : 0;
    let classInfo = await School.findById(topic.classId).lean();
    if (!classInfo) {
      classInfo = await College.findById(topic.classId).lean();
    }
    topicObj.classInfo = classInfo || null;
    topicObj.testTimeInSeconds = topic.testTime ? topic.testTime * 60 : 0;
    const quizzes = await Quiz.find({ topicId: id }).select('-__v');
    topicObj.quizzes = quizzes || [];

    res.status(200).json({
      message: 'Topic fetched successfully.',
      data: topicObj
    });
  } catch (error) {
    console.error('Error fetching topic by ID:', error);
    res.status(500).json({
      message: 'Error fetching topic.',
      error: error.message
    });
  }
};


// exports.submitQuiz = async (req, res) => {
//   try {
//     const userId = req.user._id;   
//     const { topicId, quizzes } = req.body;
//     if (!topicId) {
//       return res.status(400).json({ message: 'topicId is required.' });
//     }
//     if (!Array.isArray(quizzes) || quizzes.length === 0) {
//       return res.status(400).json({ message: 'quizzes must be a non-empty array.' });
//     }
//     let correctCount = 0;
//     let incorrectCount = 0;
//     for (const item of quizzes) { 
//       const quiz = await Quiz.findOne({ _id: item.questionId, topicId }).lean();
//       if (!quiz) continue;  
//       const isCorrect = item.selectedAnswer === quiz.answer;
//       if (isCorrect) correctCount++;
//       else incorrectCount++;
//     }
//     const total = correctCount + incorrectCount;
//     const score = total > 0 ? (correctCount / total) * 100 : 0;
//     const roundedScore = parseFloat(score.toFixed(2));
//     const topic = await Topic.findById(topicId);
//     if (!topic) {
//       return res.status(404).json({ message: 'Topic not found.' });
//     }
//     if (topic.score === null || topic.score === undefined) {
//       topic.score = roundedScore;
//       topic.totalQuestions = total;
//       topic.correctAnswers = correctCount;
//       topic.incorrectAnswers = incorrectCount;
//       await topic.save();
//       return res.status(200).json({
//         message: 'Quiz submitted successfully and score saved.',
//         totalQuestions: total,
//         correctAnswers: correctCount,
//         incorrectAnswers: incorrectCount,
//         score: roundedScore
//       });
//     } else {   
//       return res.status(200).json({
//         message: 'Quiz submitted successfully, score was already saved.',
//         totalQuestions: topic.totalQuestions ?? 0,
//         correctAnswers: topic.correctAnswers ?? 0,
//         incorrectAnswers: topic.incorrectAnswers ?? 0,
//         score: topic.score
//       });
//     }
//   } catch (error) {
//     console.error('Error in submitQuiz:', error);
//     res.status(500).json({ message: error.message });
//   }
// };


exports.submitQuiz = async (req, res) => {
  try {
    const userId = req.user._id;   
    const { topicId, quizzes } = req.body;
    if (!topicId) {
      return res.status(400).json({ message: 'topicId is required.' });
    }
    if (!Array.isArray(quizzes) || quizzes.length === 0) {
      return res.status(400).json({ message: 'quizzes must be a non-empty array.' });
    }
    let correctCount = 0;
    let incorrectCount = 0;
    for (const item of quizzes) { 
      const quiz = await Quiz.findOne({ _id: item.questionId, topicId }).lean();
      if (!quiz) continue;  
      const isCorrect = item.selectedAnswer === quiz.answer;
      if (isCorrect) correctCount++;
      else incorrectCount++;
    }
    const total = correctCount + incorrectCount;
    const score = total > 0 ? (correctCount / total) * 100 : 0;
    const roundedScore = parseFloat(score.toFixed(2));
    const topic = await Topic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found.' });
    }
    if (topic.score === null || topic.score === undefined) {
      topic.score = roundedScore;
      topic.totalQuestions = total;
      topic.correctAnswers = correctCount;
      topic.incorrectAnswers = incorrectCount;
      await topic.save();
      return res.status(200).json({
        message: 'Quiz submitted successfully and score saved.',
        totalQuestions: total,
        correctAnswers: correctCount,
        incorrectAnswers: incorrectCount,
        score: roundedScore
      });
    } else {   
      return res.status(200).json({
        message: 'Quiz submitted successfully, score was already saved.',
        totalQuestions: topic.totalQuestions ?? 0,
        correctAnswers: topic.correctAnswers ?? 0,
        incorrectAnswers: topic.incorrectAnswers ?? 0,
        score: topic.score
      });
    }
  } catch (error) {
    console.error('Error in submitQuiz:', error);
    res.status(500).json({ message: error.message });
  }
};


exports.saveQuizAnswer = async (req, res) => {
  try {
    const userId = req.user._id;
    const { topicId, questionId, selectedAnswer } = req.body;

    if (!topicId || !questionId) {
      return res.status(400).json({ message: 'topicId and questionId are required.' });
    }

    const quiz = await Quiz.findOne({ _id: questionId, topicId }).lean();
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz question not found for the given topic.' });
    }

    if (selectedAnswer) {
      await UserQuizAnswer.findOneAndUpdate(
        { userId, topicId, questionId },
        { selectedAnswer },
        { upsert: true, new: true }
      );
      return res.status(200).json({ message: 'Answer saved successfully.' });
    } else {
      await UserQuizAnswer.findOneAndDelete({ userId, topicId, questionId });
      return res.status(200).json({ message: 'Question skipped (no answer saved).' });
    }

  } catch (error) {
    console.error('Error in saveQuizAnswer:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.submitQuizAnswer = async (req, res) => {
  try {
    const userId = req.user._id;
    const { topicId, questionId, selectedAnswer } = req.body;
    if (!topicId || !questionId) {
      return res.status(400).json({ message: 'topicId and questionId are required.' });
    }
    const quiz = await Quiz.findOne({ _id: questionId, topicId }).lean();
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz question not found for the given topic.' });
    }
    if (selectedAnswer) {
      await UserQuizAnswer.findOneAndUpdate(
        { userId, topicId, questionId },
        { selectedAnswer },
        { upsert: true, new: true }
      );
      return res.status(200).json({ message: 'Answer saved successfully.' });
    } else {
      await UserQuizAnswer.findOneAndDelete({ userId, topicId, questionId });
      return res.status(200).json({ message: 'Question skipped (no answer saved).' });
    }
  } catch (error) {
    console.error('Error in saveQuizAnswer:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.calculateQuizScore = async (req, res) => {
  try {
    const userId = req.user._id;
    const { topicId, topicTotalMarks, negativeMarking = 0 } = req.body;

    if (!topicId) {
      return res.status(400).json({ message: 'topicId is required.' });
    }

    if (typeof negativeMarking !== 'number' || negativeMarking < 0) {
      return res.status(400).json({ message: 'negativeMarking must be a non-negative number.' });
    }

    const topic = await Topic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found.' });
    }

    const allQuizzes = await Quiz.find({ topicId }).lean();
    const totalQuestions = allQuizzes.length;

    if (totalQuestions === 0) {
      return res.status(400).json({ message: 'No questions found for this topic.' });
    }

    const totalMarks = (typeof topicTotalMarks === 'number' && topicTotalMarks > 0)
      ? topicTotalMarks
      : totalQuestions;

    const answers = await UserQuizAnswer.find({ userId, topicId });

    let correctCount = 0;
    let incorrectCount = 0;

    for (const answer of answers) {
      const quiz = allQuizzes.find(q => q._id.toString() === answer.questionId.toString());
      if (!quiz) continue;

      if (answer.selectedAnswer === quiz.answer) correctCount++;
      else incorrectCount++;
    }

    const answeredQuestions = correctCount + incorrectCount;
    const skippedQuestions = totalQuestions - answeredQuestions;

    const marksPerQuestion = totalMarks / totalQuestions;
    const positiveMarks = correctCount * marksPerQuestion;
    const negativeMarks = incorrectCount * negativeMarking;

    let marksObtained = positiveMarks - negativeMarks;
    if (marksObtained < 0) marksObtained = 0;

    const roundedMarks = parseFloat(marksObtained.toFixed(2));
    const scorePercent = (roundedMarks / totalMarks) * 100;
    const roundedScorePercent = parseFloat(scorePercent.toFixed(2));

    if (topic.score === null || topic.score === undefined) {
      topic.score = roundedScorePercent;
      topic.totalQuestions = totalQuestions;
      topic.correctAnswers = correctCount;
      topic.incorrectAnswers = incorrectCount;
      topic.skippedQuestions = skippedQuestions;
      topic.marksObtained = roundedMarks;
      topic.totalMarks = totalMarks;
      topic.negativeMarking = negativeMarking;
      await topic.save();
    }

    return res.status(200).json({
      message: 'Score calculated successfully.',
      totalQuestions,
      answeredQuestions,
      skippedQuestions,
      correctAnswers: correctCount,
      incorrectAnswers: incorrectCount,
      marksObtained: roundedMarks,
      totalMarks,
      negativeMarking,
      scorePercent: roundedScorePercent
    });

  } catch (error) {
    console.error('Error in calculateQuizScore:', error);
    res.status(500).json({ message: error.message });
  }
};
