const express = require('express');
const router = express.Router();
const topicController = require('../controllers/topicController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post(
  '/createTopic',auth,
  upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 }
  ]),
  topicController.createTopicWithQuiz 
);


router.post('/createQuiz',auth,topicController.addQuizToTopic);
router.get('/getAllTopicsWithQuizzes',topicController.getAllTopicsWithQuizzes);
router.get('/getTopicWithQuizById/:topicId',topicController.getTopicWithQuizById);

router.get('/quizzes/learning/:id', auth, topicController.getAllQuizzesByLearningId);

router.get('/TopicWithLeaning/:id',auth,topicController.TopicWithLeaning);
router.get('/TopicWithLeaningadmin/:id',topicController.TopicWithLeaningAdmin);
router.get('/getAllTopics',topicController.getAllTopicNames);
router.post('/submit-quiz',auth,topicController.submitQuiz);

router.post('/save-quiz',auth,topicController.saveQuizAnswer);
router.post('/PracticeTest',auth,topicController.PracticeTest);

router.post('/saveQuizAnswer',auth,topicController.submitQuizAnswer);

router.post('/calculateQuizScore',auth,topicController.calculateQuizScore);
router.post('/calculatePracticeScore',auth,topicController.calculateQuizScoreByLearning);
router.get('/getUserScoresByDate',auth,topicController.getUserScoresByDate);

router.get('/getTopicById/:id',topicController.getTopicById);


router.post('/topics/:topicId', topicController.updateTestTimeInSeconds);
router.get('/strict', auth, topicController.StrictScore);


router.put('/updateTopicWithQuiz/:id', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), topicController.updateTopicWithQuiz);

router.delete('/deleteTopic/:id',topicController.deleteTopicWithQuiz);


module.exports = router;
