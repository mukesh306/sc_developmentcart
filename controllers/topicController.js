const Topic = require('../models/topic');
const Quiz = require('../models/quiz');
const School = require('../models/school');
const College = require('../models/college');
const moment = require('moment'); 

exports.createTopicWithQuiz = async (req, res) => {
  try {
    const {
      classId,
      learningId,
      topic,
      description,
      videoLink
    } = req.body;

    const createdBy = req.user._id;
    const image = req.files?.image?.[0]?.path || null;
    const videoFile = req.files?.video?.[0]?.path || null;
    

    // ✅ Validate: Only one video source allowed
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
      description,
      image,
      video, // ✅ Only one video source saved
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
//     const { classId } = req.query;

//     const user = req.user;
//     if (!user || user.status !== 'yes') {
//       return res.status(403).json({ message: 'Access denied. Please complete your payment.' });
//     }

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


exports.TopicWithLeaning = async (req, res) => {
  try {
    const { id } = req.params;
    const { classId } = req.query;
    const user = req.user;

    if (!user || user.status !== 'yes') {
      return res.status(403).json({ message: 'Access denied. Please complete your payment.' });
    }
    const registrationDate = moment(user.createdAt).startOf('day');
    const today = moment().startOf('day');
    const daysPassed = today.diff(registrationDate, 'days') + 1;

    const query = { learningId: id };
    if (classId) {
      query.classId = classId;
    }

    const allTopics = await Topic.find(query)
      .sort({ createdAt: 1 }) 
      .select('topic score createdAt')
      .lean();

    if (!allTopics || allTopics.length === 0) {
      return res.status(404).json({ message: 'No topics found for this learningId' });
    }
    const unlockedTopics = allTopics.slice(0, daysPassed).map(topic => {
      if (topic.score === null) {
        const { score, ...rest } = topic;
        return rest;
      }
      return topic;
    });

    res.status(200).json({ topics: unlockedTopics });

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
    if (!topic.score || topic.score === 0) {
    
      topic.score = roundedScore;
      await topic.save();

      return res.status(200).json({
        message: 'Quiz submitted successfully',
        score: `${roundedScore}%`
      });
    } else {
      return res.status(200).json({
        message: 'Quiz submitted successfully and score not update'
      });
    }
  } catch (error) {
    console.error('Error in submitQuiz:', error);
    res.status(500).json({ message: error.message });
  }
};


// exports.submitQuiz = async (req, res) => {
//   try {
//     const { quizzes } = req.body;
//     if (!Array.isArray(quizzes) || quizzes.length === 0) {
//       return res.status(400).json({ message: 'quizzes must be a non-empty array.' });
//     }
//     let correctCount = 0;
//     let incorrectCount = 0;
//     const detailedResults = [];

//     for (const item of quizzes) {
//       const quiz = await Quiz.findById(item.questionId).lean();
//       if (!quiz) {
//         detailedResults.push({
//           questionId: item.questionId,
//           status: 'not found'
//         });
//         continue;
//       }

//       const isCorrect = item.selectedAnswer === quiz.answer;

//       if (isCorrect) correctCount++;
//       else incorrectCount++;

//       detailedResults.push({
//         questionId: quiz._id,
//         question: quiz.question,
//         selectedAnswer: item.selectedAnswer,
//         correctAnswer: quiz.answer,
//         status: isCorrect ? 'correct' : 'incorrect'
//       });
//     }

//     const total = correctCount + incorrectCount;
//     const score = total > 0 ? (correctCount / total) * 100 : 0;

//     res.status(200).json({
//       totalQuestions: total,
//       correctAnswers: correctCount,
//       incorrectAnswers: incorrectCount,
//       score: `${score.toFixed(2)}%`,
//       // detailedResults
//     });
//   } catch (error) {
//     console.error('Error in submitQuiz:', error);
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

    let classInfo = await School.findById(topic.classId).lean();
    if (!classInfo) {
      classInfo = await College.findById(topic.classId).lean();
    }
    topicObj.classInfo = classInfo || null;

    // Add quizzes
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
