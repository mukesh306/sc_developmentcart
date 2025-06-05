const express = require('express');
const router = express.Router();
const practiceController = require('../controllers/practicesTes');
const auth = require('../middleware/auth');



router.post('/PracticeTest',auth,practiceController.PracticeTest);
router.get('/getAssignedListUserpractice',auth,practiceController.getAssignedListUserpractice);
router.post('/calculatePracticeScore',auth,practiceController.calculateQuizScoreByLearning);


module.exports = router;
