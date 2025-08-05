const express = require('express');
const router = express.Router();
const practiceController = require('../controllers/practicesTes');
const auth = require('../middleware/auth');
const checkUserSession = require('../middleware/checkUserSession');


router.post('/PracticeTest',auth,practiceController.PracticeTest);
router.get('/getAssignedListUserpractice',auth,practiceController.getAssignedListUserpractice);
router.post('/calculatePracticeScore',auth,practiceController.calculateQuizScoreByLearning);
router.get('/StrikePath', auth, practiceController.userView);

module.exports = router;
