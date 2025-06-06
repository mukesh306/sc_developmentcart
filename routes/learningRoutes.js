const express = require('express');
const router = express.Router();
const learningController = require('../controllers/learningController');
const auth = require('../middleware/auth');
router.post('/learning',auth, learningController.createLearning);
router.get('/learning', learningController.getLearning);
router.delete('/learning/:id', learningController.deleteLearning);
router.put('/learning/:id', learningController.updateLearning);
router.get('/scorecard', auth, learningController.scoreCard);
router.get('/StrictPractice', auth, learningController.Practicestrike);
router.get('/Topicstrikes', auth, learningController.Topicstrikes);
router.get('/Strike', auth, learningController.StrikeBothSameDate);
router.get('/Strikecalculation', auth, learningController.Strikecalculation);

module.exports = router;
