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
router.get('/TopicWithLeaning/:id',topicController.TopicWithLeaning);
router.get('/getAllTopics',topicController.getAllTopicNames);
router.post('/submit-quiz',auth,topicController.submitQuiz);
router.get('/getTopicById/:id',topicController.getTopicById);





module.exports = router;
