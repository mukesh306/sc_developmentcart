
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
const DescriptionVideo = require('../models/descriptionvideo'); 
const User = require('../models/User');
const path = require('path');
const fs = require('fs');

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
    // const image = req.files?.image?.[0]?.path || null;

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    // ⬇️ Handle image
    let image = req.files?.image?.[0]?.path || null;
    if (image && fs.existsSync(image)) {
      image = `${baseUrl}/uploads/${path.basename(image)}`;
    }

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



// exports.TopicWithLeaning = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { classId: queryClassId } = req.query;
//     const user = req.user;

//     if (!user || user.status !== 'yes') {
//       return res.status(403).json({ message: 'Access denied. Please complete your payment.' });
//     }

//     const registrationDate = moment(user.createdAt).startOf('day');
//     const today = moment().startOf('day');
//     const daysPassed = today.diff(registrationDate, 'days') + 1;

//     const query = { learningId: new mongoose.Types.ObjectId(id) };
//     if (queryClassId) {
//       query.classId = new mongoose.Types.ObjectId(queryClassId);
//     } else if (user.className) {
//       query.classId = new mongoose.Types.ObjectId(user.className);
//     }

//     const learningData = await Learning.findById(id).select('name').lean();
//     if (!learningData) {
//       return res.status(404).json({ message: 'Learning not found.' });
//     }

//     const allTopics = await Topic.find(query)
//       .sort({ createdAt: 1 })
//       .select('topic createdAt')
//       .lean();

//     if (!allTopics || allTopics.length === 0) {
//       return res.status(404).json({ message: 'No topics found for this learningId or classId' });
//     }

//     const userDescriptionVideos = await DescriptionVideo.find({
//       userId: user._id,
//       learningId: id
//     }).select('topicId isvideo isdescription').lean();

//     const descriptionMap = {};
//     userDescriptionVideos.forEach(entry => {
//       descriptionMap[entry.topicId.toString()] = {
//         isvideo: entry.isvideo,
//         isdescription: entry.isdescription
//       };
//     });

//     const topicScores = await TopicScore.find({
//       userId: user._id,
//       learningId: id
//     }).select('topicId score').lean();

//     const scoreMap = {};
//     topicScores.forEach(entry => {
//       scoreMap[entry.topicId.toString()] = entry.score;
//     });

   
//     const unlockedTopics = allTopics.slice(0, daysPassed).map(topic => {
//       const topicIdStr = topic._id.toString();
//       const extra = descriptionMap[topicIdStr] || { isvideo: false, isdescription: false };
//       const topicScoreValue = scoreMap.hasOwnProperty(topicIdStr) ? scoreMap[topicIdStr] : null;

//       return {
//         _id: topic._id,
//         topic: topic.topic,
//         createdAt: topic.createdAt,
//         isvideo: extra.isvideo,
//         isdescription: extra.isdescription,
//         score: topicScoreValue
//       };
//     });

//     const validScores = unlockedTopics
//       .map(t => t.score)
//       .filter(score => score !== null && score !== undefined)
//       .map(score => Number(score));

//     const averageScore = validScores.length > 0
//       ? parseFloat((validScores.reduce((acc, val) => acc + val, 0) / validScores.length).toFixed(2))
//       : null;

//     const assignedRecord = await Assigned.findOne({ classId: queryClassId || user.className });
//     if (assignedRecord) {
//       if (assignedRecord.learning?.toString() === id) {
//         assignedRecord.learningAverage = averageScore;
//       } else if (assignedRecord.learning2?.toString() === id) {
//         assignedRecord.learning2Average = averageScore;
//       } else if (assignedRecord.learning3?.toString() === id) {
//         assignedRecord.learning3Average = averageScore;
//       } else if (assignedRecord.learning4?.toString() === id) {
//         assignedRecord.learning4Average = averageScore;
//       }
//       await assignedRecord.save();
//     }

//     res.status(200).json({
//       learningName: learningData.name,
//       averageScore,
//       topics: unlockedTopics
//     });

//   } catch (error) {
//     console.error('Error fetching topics with learningId:', error);
//     res.status(500).json({ message: error.message });
//   }
// };



exports.TopicWithLeaning = async (req, res) => {
  try {
    const { id } = req.params;
    const { classId: queryClassId } = req.query;
    const user = req.user;

    if (!user || user.status !== 'yes') {
      return res.status(403).json({ message: 'Access denied. Please complete your payment.' });
    }

    if (!user.session) {
      return res.status(400).json({ message: 'User session not found.' });
    }

    const session = user.session;
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
      .select('topic createdAt')
      .lean();

    if (!allTopics || allTopics.length === 0) {
      return res.status(404).json({ message: 'No topics found for this learningId or classId' });
    }

    const userDescriptionVideos = await DescriptionVideo.find({
      userId: user._id,
      learningId: id,
      session
    }).select('topicId isvideo isdescription').lean();

    const descriptionMap = {};
    userDescriptionVideos.forEach(entry => {
      descriptionMap[entry.topicId.toString()] = {
        isvideo: entry.isvideo,
        isdescription: entry.isdescription
      };
    });

    // ✅ Fetch only session-matching TopicScore entries
    const topicScores = await TopicScore.find({
      userId: user._id,
      learningId: id,
      session
    }).select('topicId score').lean();

    const scoreMap = {};
    topicScores.forEach(entry => {
      scoreMap[entry.topicId.toString()] = entry.score;
    });

    const unlockedTopics = allTopics.slice(0, daysPassed).map(topic => {
      const topicIdStr = topic._id.toString();
      const extra = descriptionMap[topicIdStr] || { isvideo: false, isdescription: false };
      const topicScoreValue = scoreMap.hasOwnProperty(topicIdStr) ? scoreMap[topicIdStr] : null;

      return {
        _id: topic._id,
        topic: topic.topic,
        createdAt: topic.createdAt,
        isvideo: extra.isvideo,
        isdescription: extra.isdescription,
        score: topicScoreValue
      };
    });

    const validScores = unlockedTopics
      .map(t => t.score)
      .filter(score => typeof score === 'number' && score >= 0);

    const averageScore = validScores.length > 0
      ? parseFloat((validScores.reduce((acc, val) => acc + val, 0) / validScores.length).toFixed(2))
      : 0;

    const assignedRecord = await Assigned.findOne({ classId: queryClassId || user.className });
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

    res.status(200).json({
      learningName: learningData.name,
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
//     const { classId: queryClassId } = req.query;
//     const user = req.user;

//     if (!user || user.status !== 'yes') {
//       return res.status(403).json({ message: 'Access denied. Please complete your payment.' });
//     }

//     if (!user.session) {
//       return res.status(400).json({ message: 'Session not found for user.' });
//     }

//     const registrationDate = moment(user.createdAt).startOf('day');
//     const today = moment().startOf('day');
//     const daysPassed = today.diff(registrationDate, 'days') + 1;

//     const query = { learningId: new mongoose.Types.ObjectId(id) };
//     if (queryClassId) {
//       query.classId = new mongoose.Types.ObjectId(queryClassId);
//     } else if (user.className) {
//       query.classId = new mongoose.Types.ObjectId(user.className);
//     }

//     const learningData = await Learning.findById(id).select('name').lean();
//     if (!learningData) {
//       return res.status(404).json({ message: 'Learning not found.' });
//     }

//     const allTopics = await Topic.find(query)
//       .sort({ createdAt: 1 })
//       .select('topic createdAt')
//       .lean();

//     if (!allTopics || allTopics.length === 0) {
//       return res.status(404).json({ message: 'No topics found for this learningId or classId' });
//     }

//     const userDescriptionVideos = await DescriptionVideo.find({
//       userId: user._id,
//       learningId: id
//     }).select('topicId isvideo isdescription').lean();

//     const descriptionMap = {};
//     userDescriptionVideos.forEach(entry => {
//       descriptionMap[entry.topicId.toString()] = {
//         isvideo: entry.isvideo,
//         isdescription: entry.isdescription
//       };
//     });

//     // ✅ Filter TopicScores based on user.session
//     const topicScores = await TopicScore.find({
//       userId: user._id,
//       learningId: id,
//       session: user.session
//     }).select('topicId score').lean();

//     const scoreMap = {};
//     topicScores.forEach(entry => {
//       scoreMap[entry.topicId.toString()] = entry.score;
//     });

//     // ✅ Limit to daysPassed and attach scores or 0 if no match
//     const unlockedTopics = allTopics.slice(0, daysPassed).map(topic => {
//       const topicIdStr = topic._id.toString();
//       const extra = descriptionMap[topicIdStr] || { isvideo: false, isdescription: false };
//       const topicScoreValue = scoreMap.hasOwnProperty(topicIdStr) ? scoreMap[topicIdStr] : 0;

//       return {
//         _id: topic._id,
//         topic: topic.topic,
//         createdAt: topic.createdAt,
//         isvideo: extra.isvideo,
//         isdescription: extra.isdescription,
//         score: topicScoreValue
//       };
//     });

//     const validScores = unlockedTopics
//       .map(t => t.score)
//       .filter(score => score !== null && score !== undefined)
//       .map(score => Number(score));

//     const averageScore = validScores.length > 0
//       ? parseFloat((validScores.reduce((acc, val) => acc + val, 0) / validScores.length).toFixed(2))
//       : 0;

//     const assignedRecord = await Assigned.findOne({ classId: queryClassId || user.className });
//     if (assignedRecord) {
//       if (assignedRecord.learning?.toString() === id) {
//         assignedRecord.learningAverage = averageScore;
//       } else if (assignedRecord.learning2?.toString() === id) {
//         assignedRecord.learning2Average = averageScore;
//       } else if (assignedRecord.learning3?.toString() === id) {
//         assignedRecord.learning3Average = averageScore;
//       } else if (assignedRecord.learning4?.toString() === id) {
//         assignedRecord.learning4Average = averageScore;
//       }
//       await assignedRecord.save();
//     }

//     res.status(200).json({
//       learningName: learningData.name,
//       averageScore,
//       topics: unlockedTopics
//     });

//   } catch (error) {
//     console.error('Error fetching topics with learningId:', error);
//     res.status(500).json({ message: error.message });
//   }
// };


exports.getTopicById = async (req, res) => {
  try {
    const { id } = req.params;
    const { isvideo, isdescription } = req.query;
    const userId = req.user._id;
    const userSession = req.user.session;

    const topic = await Topic.findById(id)
      .populate('learningId')
      .populate('createdBy', 'email');

    if (!topic) {
      return res.status(404).json({ message: 'Topic not found.' });
    }

    const learningId = topic.learningId?._id || null;

    // 🔍 Find DescriptionVideo for current session
    let currentSessionRecord = await DescriptionVideo.findOne({
      userId,
      topicId: topic._id,
      learningId,
      session: userSession,
    });

    // 🆕 If not found and isdescription=true, create new record
    if (!currentSessionRecord && isdescription === 'true') {
      currentSessionRecord = await DescriptionVideo.create({
        userId,
        topicId: topic._id,
        learningId,
        isvideo: false,
        isdescription: true,
        session: userSession,
        scoreDate: new Date(),
      });
    }

    // ✅ Update isvideo = true only if session matches
    if (
      currentSessionRecord &&
      isvideo === 'true' &&
      !currentSessionRecord.isvideo
    ) {
      currentSessionRecord.isvideo = true;
      await currentSessionRecord.save();
    }

    // ✅ Score for current session only
    const topicScoreData = await TopicScore.findOne({
      userId,
      topicId: topic._id,
      session: userSession,
    }).select(
      'score totalQuestions answeredQuestions correctAnswers incorrectAnswers skippedQuestions marksObtained totalMarks negativeMarking scorePercent strickStatus scoreDate createdAt updatedAt'
    ).lean();

    const topicObj = topic.toObject();
    topicObj.testTimeInSeconds = topic.testTimeInSeconds || (topic.testTime ? topic.testTime * 60 : 0);

    // ✅ Add full image URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    if (topicObj.image) {
      topicObj.image = `${baseUrl}/uploads/${path.basename(topicObj.image)}`;
    }

    // Class info (school or college)
    let classInfo = await School.findById(topic.classId).lean();
    if (!classInfo) {
      classInfo = await College.findById(topic.classId).lean();
    }
    topicObj.classInfo = classInfo || null;

    // Quizzes
    const quizzes = await Quiz.find({ topicId: id }).select('-__v');
    topicObj.quizzes = quizzes || [];

    // ✅ Set flags from session-specific record
    topicObj.isvideo = currentSessionRecord?.isvideo === true;
    topicObj.isdescription = currentSessionRecord?.isdescription === true;

    // ✅ Set score fields only if session matches
    topicObj.score = topicScoreData?.score || null;
    topicObj.totalQuestions = topicScoreData?.totalQuestions || 0;
    topicObj.answeredQuestions = topicScoreData?.answeredQuestions || 0;
    topicObj.correctAnswers = topicScoreData?.correctAnswers || 0;
    topicObj.incorrectAnswers = topicScoreData?.incorrectAnswers || 0;
    topicObj.skippedQuestions = topicScoreData?.skippedQuestions || 0;
    topicObj.marksObtained = topicScoreData?.marksObtained || 0;
    topicObj.totalMarks = topicScoreData?.totalMarks || 0;
    topicObj.negativeMarking = topicScoreData?.negativeMarking || 0;
    topicObj.scorePercent = topicScoreData?.scorePercent || 0;
    topicObj.strickStatus = topicScoreData?.strickStatus || false;
    topicObj.scoreDate = topicScoreData?.scoreDate || null;
    topicObj.createdAt = topicScoreData?.createdAt || null;
    topicObj.updatedAt = topicScoreData?.updatedAt || null;

    res.status(200).json({
      message: 'Topic fetched successfully.',
      data: topicObj,
    });

  } catch (error) {
    console.error('Error fetching topic by ID:', error);
    res.status(500).json({
      message: 'Error fetching topic.',
      error: error.message,
    });
  }
};





// exports.getTopicById = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { isvideo, isdescription } = req.query;
//     const userId = req.user._id;

//     const topic = await Topic.findById(id)
//       .populate('learningId')
//       .populate('createdBy', 'email');

//     if (!topic) {
//       return res.status(404).json({ message: 'Topic not found.' });
//     }

//     const learningId = topic.learningId?._id || null;

//     // Find or update DescriptionVideo
//     let existingRecord = await DescriptionVideo.findOne({
//       userId,
//       topicId: topic._id,
//       learningId
//     });

//     if (!existingRecord && isdescription === 'true') {
//       existingRecord = await DescriptionVideo.create({
//         userId,
//         topicId: topic._id,
//         learningId,
//         isvideo: false,
//         isdescription: true,
//         scoreDate: new Date()
//       });
//     }

//     if (existingRecord && isvideo === 'true' && !existingRecord.isvideo) {
//       existingRecord.isvideo = true;
//       await existingRecord.save();
//     }

//     const latestDescription = await DescriptionVideo.findOne({
//       userId,
//       topicId: topic._id,
//       learningId
//     }).sort({ createdAt: -1 }).select('isvideo isdescription');

//     // ✅ Fetch topicScore with only required fields
//     const topicScoreData = await TopicScore.findOne({
//       userId,
//       topicId: topic._id
//     }).select(
//       'score totalQuestions answeredQuestions correctAnswers incorrectAnswers skippedQuestions marksObtained totalMarks negativeMarking scorePercent strickStatus scoreDate createdAt updatedAt'
//     ).lean();

//     const topicObj = topic.toObject();
//     topicObj.testTimeInSeconds = topic.testTimeInSeconds || (topic.testTime ? topic.testTime * 60 : 0);

//     // Add class info
//     let classInfo = await School.findById(topic.classId).lean();
//     if (!classInfo) {
//       classInfo = await College.findById(topic.classId).lean();
//     }
//     topicObj.classInfo = classInfo || null;

//     // Add quizzes
//     const quizzes = await Quiz.find({ topicId: id }).select('-__v');
//     topicObj.quizzes = quizzes || [];

//     // Add video/description flags
//     topicObj.isvideo = latestDescription?.isvideo || false;
//     topicObj.isdescription = latestDescription?.isdescription || false;

//     // 🔥 Add filtered topicScore data directly (flattened)
//     topicObj.score = topicScoreData?.score || null;
//     topicObj.totalQuestions = topicScoreData?.totalQuestions || 0;
//     topicObj.answeredQuestions = topicScoreData?.answeredQuestions || 0;
//     topicObj.correctAnswers = topicScoreData?.correctAnswers || 0;
//     topicObj.incorrectAnswers = topicScoreData?.incorrectAnswers || 0;
//     topicObj.skippedQuestions = topicScoreData?.skippedQuestions || 0;
//     topicObj.marksObtained = topicScoreData?.marksObtained || 0;
//     topicObj.totalMarks = topicScoreData?.totalMarks || 0;
//     topicObj.negativeMarking = topicScoreData?.negativeMarking || 0;
//     topicObj.scorePercent = topicScoreData?.scorePercent || 0;
//     topicObj.strickStatus = topicScoreData?.strickStatus || false;
//     topicObj.scoreDate = topicScoreData?.scoreDate || null;
//     topicObj.createdAt = topicScoreData?.createdAt || null;
//     topicObj.updatedAt = topicScoreData?.updatedAt || null;

//     // Send response
//     res.status(200).json({
//       message: 'Topic fetched successfully.',
//       data: topicObj
//     });

//   } catch (error) {
//     console.error('Error fetching topic by ID:', error);
//     res.status(500).json({
//       message: 'Error fetching topic.',
//       error: error.message
//     });
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

    // Get the quiz question
    const quiz = await Quiz.findOne({ _id: questionId, topicId }).lean();
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz question not found for the given topic.' });
    }

    // ✅ Fetch user's session
    const user = await User.findById(userId).select('session').lean();
    const session = user?.session || null;

    console.log('Saving with session:', session); // ✅ Debug log

    if (selectedAnswer) {
      await UserQuizAnswer.findOneAndUpdate(
        { userId, topicId, questionId },
        {
          selectedAnswer,
          session 
        },
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

// exports.submitQuizAnswer = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { topicId, questionId, selectedAnswer } = req.body;
//     if (!topicId || !questionId) {
//       return res.status(400).json({ message: 'topicId and questionId are required.' });
//     }
//     const quiz = await Quiz.findOne({ _id: questionId, topicId }).lean();
//     if (!quiz) {
//       return res.status(404).json({ message: 'Quiz question not found for the given topic.' });
//     }
//     if (selectedAnswer) {
//       await UserQuizAnswer.findOneAndUpdate(
//         { userId, topicId, questionId },
//         { selectedAnswer },
//         { upsert: true, new: true }
//       );
//       return res.status(200).json({ message: 'Answer saved successfully.' });
//     } else {
//       await UserQuizAnswer.findOneAndDelete({ userId, topicId, questionId });
//       return res.status(200).json({ message: 'Question skipped (no answer saved).' });
//     }
//   } catch (error) {
//     console.error('Error in saveQuizAnswer:', error);
//     res.status(500).json({ message: error.message });
//   }
// };



exports.updateTestTimeInSeconds = async (req, res) => {
  try {
    const { topicId } = req.params;
    const { testTimeInSeconds } = req.body;
    if (typeof testTimeInSeconds !== 'number' || testTimeInSeconds < 0) {
      return res.status(400).json({ message: 'testTimeInSeconds must be a non-negative number.' });
    }
    const topic = await Topic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found.' });
    }
    if (topic.testTimeInSeconds !== undefined) {
      topic.testTimeInSeconds = testTimeInSeconds;
      await topic.save();

      return res.status(200).json({
        message: 'testTimeInSeconds updated successfully.',
        testTimeInSeconds: topic.testTimeInSeconds
      });
    } else {
      return res.status(400).json({ message: 'testTimeInSeconds field does not exist in topic.' });
    }
  } catch (error) {
    console.error('Error updating testTimeInSeconds:', error);
    res.status(500).json({ message: error.message });
  }
};


// exports.calculateQuizScore = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { topicId, topicTotalMarks, negativeMarking: inputNegativeMarking } = req.body;

//     if (!topicId) {
//       return res.status(400).json({ message: 'topicId is required.' });
//     }

//     // 🧠 Get topic
//     const topic = await Topic.findById(topicId).lean();
//     if (!topic) {
//       return res.status(404).json({ message: 'Topic not found.' });
//     }

//     // 🧠 Get user & session
//     const user = await User.findById(userId).lean();
//     const userSession = user?.session || null;

//     // 🧠 Get all questions
//     const allQuizzes = await Quiz.find({ topicId }).lean();
//     const totalQuestions = allQuizzes.length;

//     if (totalQuestions === 0) {
//       return res.status(400).json({ message: 'No questions found for this topic.' });
//     }

//     // 🧠 Get marking settings
//     const markingSetting = await MarkingSetting.findOne().sort({ createdAt: -1 }).lean();

//     const maxMarkPerQuestion =
//       typeof topicTotalMarks === 'number' && topicTotalMarks > 0
//         ? topicTotalMarks / totalQuestions
//         : markingSetting?.maxMarkPerQuestion || 1;

//     const negativeMarking =
//       typeof inputNegativeMarking === 'number'
//         ? inputNegativeMarking
//         : markingSetting?.negativeMarking || 0;

//     const totalMarks = maxMarkPerQuestion * totalQuestions;

//     // 🧠 Get answers
//     const answers = await UserQuizAnswer.find({ userId, topicId });

//     let correctCount = 0;
//     let incorrectCount = 0;

//     for (const answer of answers) {
//       const quiz = allQuizzes.find(q => q._id.toString() === answer.questionId.toString());
//       if (!quiz) continue;
//       if (answer.selectedAnswer === quiz.answer) correctCount++;
//       else incorrectCount++;
//     }

//     const answeredQuestions = correctCount + incorrectCount;
//     const skippedQuestions = totalQuestions - answeredQuestions;

//     const positiveMarks = correctCount * maxMarkPerQuestion;
//     const negativeMarks = incorrectCount * negativeMarking;

//     let marksObtained = positiveMarks - negativeMarks;
//     if (marksObtained < 0) marksObtained = 0;

//     const roundedMarks = parseFloat(marksObtained.toFixed(2));
//     const scorePercent = (roundedMarks / totalMarks) * 100;
//     const roundedScorePercent = parseFloat(scorePercent.toFixed(2));

//     // 🔍 Check for existing score for same topic + same session + same user
//     const existingScore = await TopicScore.findOne({
//       userId,
//       topicId,
//       session: userSession
//     });

//     if (!existingScore) {
//       await TopicScore.create({
//         userId,
//         topicId,
//         learningId: topic.learningId,
//         score: roundedScorePercent,
//         totalQuestions,
//         answeredQuestions,
//         correctAnswers: correctCount,
//         incorrectAnswers: incorrectCount,
//         skippedQuestions,
//         marksObtained: roundedMarks,
//         totalMarks,
//         negativeMarking,
//         scorePercent: roundedScorePercent,
//         scoreDate: new Date(),
//         strickStatus: true,
//         session: userSession // ✅ Store session from user model
//       });
//     }

//     return res.status(200).json({
//       message: existingScore
//         ? 'Score already saved. Recalculated result returned for display only.'
//         : 'Score calculated and saved successfully.',
//       totalQuestions,
//       answeredQuestions,
//       skippedQuestions,
//       correctAnswers: correctCount,
//       incorrectAnswers: incorrectCount,
//       marksObtained: roundedMarks,
//       totalMarks,
//       maxMarkPerQuestion,
//       negativeMarking,
//       scorePercent: roundedScorePercent,
//       testTime: topic.testTime || 0,
//       strickStatus: true,
//       session: userSession,
//       scoreUpdatedAt: new Date()
//     });

//   } catch (error) {
//     console.error('Error in calculateQuizScore:', error);
//     res.status(500).json({ message: error.message });
//   }
// };



exports.calculateQuizScore = async (req, res) => {
  try {
    const userId = req.user._id;
    const { topicId, topicTotalMarks, negativeMarking: inputNegativeMarking } = req.body;

    if (!topicId) {
      return res.status(400).json({ message: 'topicId is required.' });
    }

    const topic = await Topic.findById(topicId).lean();
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found.' });
    }

    const user = await User.findById(userId).lean();
    const userSession = user?.session || null;
    const userClassId = user?.className || null;

    const allQuizzes = await Quiz.find({ topicId }).lean();
    const totalQuestions = allQuizzes.length;

    if (totalQuestions === 0) {
      return res.status(400).json({ message: 'No questions found for this topic.' });
    }

    const markingSetting = await MarkingSetting.findOne().sort({ createdAt: -1 }).lean();

    const maxMarkPerQuestion =
      typeof topicTotalMarks === 'number' && topicTotalMarks > 0
        ? topicTotalMarks / totalQuestions
        : markingSetting?.maxMarkPerQuestion || 1;

    const negativeMarking =
      typeof inputNegativeMarking === 'number'
        ? inputNegativeMarking
        : markingSetting?.negativeMarking || 0;

    const totalMarks = maxMarkPerQuestion * totalQuestions;

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

    const positiveMarks = correctCount * maxMarkPerQuestion;
    const negativeMarks = incorrectCount * negativeMarking;

    let marksObtained = positiveMarks - negativeMarks;
    if (marksObtained < 0) marksObtained = 0;

    const roundedMarks = parseFloat(marksObtained.toFixed(2));
    const scorePercent = (roundedMarks / totalMarks) * 100;
    const roundedScorePercent = parseFloat(scorePercent.toFixed(2));

    const existingScore = await TopicScore.findOne({
      userId,
      topicId,
      session: userSession
    });

    if (!existingScore) {
      await TopicScore.create({
        userId,
        topicId,
        learningId: topic.learningId,
        score: roundedScorePercent,
        totalQuestions,
        answeredQuestions,
        correctAnswers: correctCount,
        incorrectAnswers: incorrectCount,
        skippedQuestions,
        marksObtained: roundedMarks,
        totalMarks,
        negativeMarking,
        scorePercent: roundedScorePercent,
        scoreDate: new Date(),
        strickStatus: true,
        session: userSession,     // ✅ session from user
        classId: userClassId      // ✅ className saved as classId
      });
    }

    return res.status(200).json({
      message: existingScore
        ? 'Score already saved. Recalculated result returned for display only.'
        : 'Score calculated and saved successfully.',
      totalQuestions,
      answeredQuestions,
      skippedQuestions,
      correctAnswers: correctCount,
      incorrectAnswers: incorrectCount,
      marksObtained: roundedMarks,
      totalMarks,
      maxMarkPerQuestion,
      negativeMarking,
      scorePercent: roundedScorePercent,
      testTime: topic.testTime || 0,
      strickStatus: true,
      session: userSession,
      classId: userClassId,           // ✅ return classId in response too (optional)
      scoreUpdatedAt: new Date()
    });

  } catch (error) {
    console.error('Error in calculateQuizScore:', error);
    res.status(500).json({ message: error.message });
  }
};


exports.updateTopicWithQuiz = async (req, res) => {
  try {
    const topicId = req.params.id;

    const {
      classId,
      learningId,
      topic,
      testTime,
      videoTime,
      description
    } = req.body;

    const image = req.files?.image?.[0]?.path || null;
    const videoFile = req.files?.video?.[0]?.path || null;
    const videoLink = req.body.video || null;

    if (videoFile && videoLink) {
      return res.status(400).json({
        message: 'Please provide either a video file or a video link, not both.'
      });
    }

    const video = videoFile || videoLink || null;

    const topicToUpdate = await Topic.findById(topicId);
    if (!topicToUpdate) {
      return res.status(404).json({ message: 'Topic not found.' });
    }

    // Update topic
    if (classId) topicToUpdate.classId = classId;
    if (learningId) topicToUpdate.learningId = learningId;
    if (topic) topicToUpdate.topic = topic;
    if (testTime) topicToUpdate.testTime = testTime;
    if (videoTime) topicToUpdate.videoTime = videoTime;
    if (description) topicToUpdate.description = description;
    if (image) topicToUpdate.image = image;
    if (video) topicToUpdate.video = video;

    await topicToUpdate.save();

    // === Parse quizQuestions ===
    let quizQuestions = [];

    if (req.body.quizQuestions) {
      try {
        quizQuestions = JSON.parse(req.body.quizQuestions);
      } catch (err) {
        return res.status(400).json({ message: 'Invalid quizQuestions format. Must be a valid JSON array.' });
      }
    }

    // === Fetch existing quizzes for topic ===
    const existingQuizzes = await Quiz.find({ topicId }).lean();
    const questionToQuizMap = new Map();

    existingQuizzes.forEach(q => {
      questionToQuizMap.set(q.question.trim().toLowerCase(), q);
    });

    // === Track questions to keep
    const questionsToKeep = new Set();

    for (const q of quizQuestions) {
      const questionKey = q.question.trim().toLowerCase();
      questionsToKeep.add(questionKey);

      const existingQuiz = questionToQuizMap.get(questionKey);

      if (existingQuiz) {
        // Update existing quiz
        await Quiz.findByIdAndUpdate(existingQuiz._id, {
          option1: q.option1,
          option2: q.option2,
          option3: q.option3,
          option4: q.option4,
          answer: q.answer
        });
      } else {
        // Insert new quiz
        await Quiz.create({
          topicId,
          question: q.question,
          option1: q.option1,
          option2: q.option2,
          option3: q.option3,
          option4: q.option4,
          answer: q.answer
        });
      }
    }

    // === Delete old quizzes not present in request ===
    const toDelete = existingQuizzes.filter(
      q => !questionsToKeep.has(q.question.trim().toLowerCase())
    );

    if (toDelete.length > 0) {
      const idsToDelete = toDelete.map(q => q._id);
      await Quiz.deleteMany({ _id: { $in: idsToDelete } });
    }

    res.status(200).json({
      message: 'Topic updated and quizzes synced successfully.',
      topicId: topicToUpdate._id
    });

  } catch (error) {
    console.error('Error updating topic and quizzes:', error);
    res.status(500).json({ message: error.message });
  }
};


exports.deleteTopicWithQuiz = async (req, res) => {
  try {
    const topicId = req.params.id;

    const topic = await Topic.findById(topicId);
    if (!topic) {
      return res.status(404).json({ message: 'Topic not found.' });
    }
    
    await Quiz.deleteMany({ topicId });

    await Topic.findByIdAndDelete(topicId);

    res.status(200).json({ message: 'Topic and related quiz deleted successfully.' });
  } catch (error) {
    console.error('Error deleting topic and quiz:', error);
    res.status(500).json({ message: error.message });
  }
};



 exports.TopicWithLeaningAdmin = async (req, res) => {
  try {
    const { id } = req.params; 
    const { classId: queryClassId } = req.query;
    const user = req.user;

    const filter = {
      learningId: new mongoose.Types.ObjectId(id)
    };

    if (queryClassId) {
      filter.classId = new mongoose.Types.ObjectId(queryClassId);
    } else if (user?.className) {
      filter.classId = new mongoose.Types.ObjectId(user.className);
    } else {
      return res.status(400).json({ message: 'Class ID is required via query or user.' });
    }

    const topics = await Topic.find(filter)
      .populate('learningId')
      .sort({ createdAt: 1 })
      .lean();

    for (let topic of topics) {
      let classInfo = await School.findById(topic.classId).lean();
      if (!classInfo) {
        classInfo = await College.findById(topic.classId).lean();
      }
      topic.classInfo = classInfo || null;
    }


    const topicIds = topics.map(t => t._id);
    const quizzes = await Quiz.find({ topicId: { $in: topicIds } }).select('-__v');
    const quizzesByTopic = {};

    quizzes.forEach((quiz) => {
      const id = quiz.topicId.toString();
      if (!quizzesByTopic[id]) {
        quizzesByTopic[id] = [];
      }
      quizzesByTopic[id].push(quiz);
    });

    const result = topics.map(topic => ({
      ...topic,
      quizzes: quizzesByTopic[topic._id.toString()] || []
    }));

    res.status(200).json({ topics: result });

  } catch (error) {
    console.error('Error fetching topics with quizzes by learningId:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getAllQuizzesByLearningId = async (req, res) => {
  try {
    const { id } = req.params;
    const { classId: queryClassId } = req.query;
    const user = req.user;

    if (!user || user.status !== 'yes') {
      return res.status(403).json({ message: 'Access denied. Please complete your payment.' });
    }

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

    const topics = await Topic.find(query).select('_id').lean();
    if (!topics.length) {
      return res.status(404).json({ message: 'No topics found for this learningId.' });
    }

    const topicIds = topics.map(t => t._id);

    const markingSetting = await MarkingSetting.findOne().sort({ createdAt: -1 }).lean();
    if (!markingSetting) {
      return res.status(404).json({ message: 'No marking settings found.' });
    }

    const { totalquiz: timeBasedOnQuestions, totalnoofquestion: quizLimit } = markingSetting;

    const allQuizzes = await Quiz.find({ topicId: { $in: topicIds } }).lean();
    const shuffledQuizzes = allQuizzes.sort(() => 0.5 - Math.random());
    const selectedQuizzes = shuffledQuizzes.slice(0, quizLimit || allQuizzes.length);

    res.status(200).json({
      message: 'Quizzes fetched successfully.',
      learningName: learningData.name,
      totalQuestions: selectedQuizzes.length,
      timeLimitInSeconds: timeBasedOnQuestions * 60,
      quizzes: selectedQuizzes
    });
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.PracticescoreCard = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).lean();
    if (!user?.session) {
      return res.status(400).json({ message: 'User session not found.' });
    }

    const userSession = user.session;
    const todayStr = moment().format('YYYY-MM-DD');
    let minDate = null;
    let maxDate = moment().startOf('day');

    // Step 1: Get first practice score per day
    const rawScores = await LearningScore.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          session: userSession
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
      { $replaceRoot: { newRoot: "$doc" } },
    ]);

    // Step 2: Populate learningId
    const populatedScores = await LearningScore.populate(rawScores, {
      path: 'learningId',
      select: 'name'
    });

    // Step 3: Normalize and map
    const scoreMap = new Map();

    for (const score of populatedScores) {
      const scoreDate = moment(score.scoreDate).startOf('day');
      const dateStr = scoreDate.format('YYYY-MM-DD');

      scoreMap.set(dateStr, {
        ...score.toObject?.() || score,
        date: dateStr,
        isToday: dateStr === todayStr
      });

      if (!minDate || scoreDate.isBefore(minDate)) minDate = scoreDate;
      if (scoreDate.isAfter(maxDate)) maxDate = scoreDate;
    }

    if (!minDate) minDate = moment().startOf('day');

    // Step 4: Fill missing days
    const fullResult = [];
    for (let m = moment(minDate); m.diff(maxDate, 'days') <= 0; m.add(1, 'days')) {
      const dateStr = m.format('YYYY-MM-DD');
      if (scoreMap.has(dateStr)) {
        fullResult.push(scoreMap.get(dateStr));
      } else {
        fullResult.push({
          date: dateStr,
          score: null,
          isToday: dateStr === todayStr
        });
      }
    }

    // Step 5: Bring today's score to top, rest sorted by date ascending
    const sortedFinal = fullResult.sort((a, b) => {
      if (a.date === todayStr) return -1;
      if (b.date === todayStr) return 1;
      return new Date(a.date) - new Date(b.date);
    });

    // Step 6: Calculate average
    const scoresOnly = fullResult
      .filter(s => typeof s.score === 'number')
      .map(s => s.score);

    const avgScore = scoresOnly.length > 0
      ? parseFloat((scoresOnly.reduce((a, b) => a + b, 0) / scoresOnly.length).toFixed(2))
      : 0;

    // Step 7: Return response
    res.status(200).json({
      scores: sortedFinal,
      averageScore: avgScore
    });

  } catch (error) {
    console.error('Error in PracticescoreCard:', error);
    res.status(500).json({ message: error.message });
  }
};


// exports.PracticescoreCard = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const user = await User.findById(userId).lean();
//     if (!user?.session) {
//       return res.status(400).json({ message: 'User session not found.' });
//     }

//     const rawScores = await LearningScore.aggregate([
//       {
//         $match: {
//           userId: new mongoose.Types.ObjectId(userId),
//           session: user.session
//         }
//       },
//       { $sort: { scoreDate: 1, createdAt: 1 } },
//       {
//         $group: {
//           _id: {
//             date: { $dateToString: { format: "%Y-%m-%d", date: "$scoreDate" } }
//           },
//           doc: { $first: "$$ROOT" }
//         }
//       },
//       { $replaceRoot: { newRoot: "$doc" } },
//     ]);

//     const populatedScores = await LearningScore.populate(rawScores, {
//       path: 'learningId',
//       select: 'name'
//     });

//     const cleaned = populatedScores.filter(s => s && s.score !== undefined);

//     const todayStr = moment().format('YYYY-MM-DD');
//     const hasToday = cleaned.some(s =>
//       moment(s.scoreDate).format('YYYY-MM-DD') === todayStr
//     );

//     // ✅ Add today's entry manually if not present
//     if (!hasToday) {
//       cleaned.push({
//         score: null,
//         scoreDate: new Date(),
//         createdAt: new Date(),
//         isToday: true,
//         date: todayStr
//       });
//     }

//     // ✅ Sort: today's date on top, rest ascending by scoreDate
//     const finalSorted = cleaned.sort((a, b) => {
//       const aDate = moment(a.scoreDate).format('YYYY-MM-DD');
//       const bDate = moment(b.scoreDate).format('YYYY-MM-DD');
//       if (aDate === todayStr) return -1;
//       if (bDate === todayStr) return 1;
//       return new Date(a.scoreDate) - new Date(b.scoreDate);
//     });

//     const scoresOnly = finalSorted
//       .filter(s => typeof s.score === 'number')
//       .map(s => s.score);

//     const avgScore = scoresOnly.length > 0
//       ? parseFloat((scoresOnly.reduce((a, b) => a + b, 0) / scoresOnly.length).toFixed(2))
//       : 0;

//     const normalized = finalSorted.map(s => {
//       const dateStr = moment(s.scoreDate).format('YYYY-MM-DD');
//       return {
//         ...s,
//         date: dateStr,
//         isToday: dateStr === todayStr
//       };
//     });

//     res.status(200).json({
//       scores: normalized,
//       averageScore: avgScore
//     });

//   } catch (error) {
//     console.error('Error in PracticescoreCard:', error);
//     res.status(500).json({ message: error.message });
//   }
// };

exports.StrictScore = async (req, res) => {
  try {
    const userId = req.user._id;
    const scores = await LearningScore.find({
      userId,
      strickStatus: true,
      scoreUpdatedAt: { $exists: true }
    }).lean();

    if (!scores.length) {
      return res.status(404).json({ message: 'No strict scores found.' });
    }
    const groupedByDate = {};

    for (const score of scores) {
      const scoreDate = moment(score.scoreUpdatedAt).startOf('day').format('YYYY-MM-DD');

      if (!groupedByDate[scoreDate]) {
        groupedByDate[scoreDate] = {
          date: scoreDate,
          scores: [],
          topics: []
        };
      }

      groupedByDate[scoreDate].scores.push(score);
    }
    const allDates = Object.keys(groupedByDate);

    for (const dateStr of allDates) {
      const startOfDay = moment(dateStr).startOf('day').toDate();
      const endOfDay = moment(dateStr).endOf('day').toDate();

      const topics = await Topic.find({
        strickStatus: true,
        scoreUpdatedAt: { $gte: startOfDay, $lte: endOfDay }
      }).lean();

      groupedByDate[dateStr].topics = topics;
    }

  
    const finalData = Object.values(groupedByDate).filter(item => item.topics.length > 0);

    if (!finalData.length) {
      return res.status(404).json({ message: 'No matching strict topics found for score dates.' });
    }

    res.status(200).json({ data: finalData });

  } catch (error) {
    console.error('Error in getAllStrictScoresWithMatchingTopics:', error);
    res.status(500).json({ message: error.message });
  }
};
