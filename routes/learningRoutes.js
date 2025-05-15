const express = require('express');
const router = express.Router();
const learningController = require('../controllers/learningController');
const auth = require('../middleware/auth');
router.post('/learning',auth, learningController.createLearning);
router.get('/learning', learningController.getLearning);
router.delete('/learning/:id', learningController.deleteLearning);

module.exports = router;
