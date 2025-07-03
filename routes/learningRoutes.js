const express = require('express');
const router = express.Router();
const learningController = require('../controllers/learningController');
const auth = require('../middleware/auth');
const checkUserSession = require('../middleware/checkUserSession');

router.post('/learning',auth, learningController.createLearning);
router.get('/learning', learningController.getLearning);
router.delete('/learning/:id', learningController.deleteLearning);
router.put('/learning/:id', learningController.updateLearning);
router.get('/scorecard', auth, learningController.scoreCard);
router.get('/StrictPractice', auth, learningController.Practicestrike);
router.get('/Topicstrikes', auth, learningController.Topicstrikes);
router.get('/Strike', auth, learningController.StrikeBothSameDate);
router.get('/Strikecalculation', auth,checkUserSession, learningController.Strikecalculation);
router.get('/StrikePath', auth,checkUserSession, learningController.StrikePath);
router.get('/leveldata', auth, learningController.getUserLevelData);
router.get('/genraliqAverage', auth, learningController.genraliqAverage);
router.get('/genrelIq', auth,checkUserSession, learningController.getGenrelIq);
router.get('/dashboard', auth,checkUserSession, learningController.Dashboard);

module.exports = router;
