const express = require('express');
const router = express.Router();
const practiceController = require('../controllers/practicesTes');
const auth = require('../middleware/auth');



router.post('/PracticeTest',auth,practiceController.PracticeTest);
router.get('/TopicWithLeaningpractices/:id',auth,practiceController.TopicWithLeaningpractice);
router.post('/calculatePracticeScore',auth,practiceController.calculateQuizScoreByLearning);
router.get('/PracticescoreCard',auth,practiceController.PracticescoreCard);

module.exports = router;
