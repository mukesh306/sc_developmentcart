const express = require('express');
const router = express.Router();
const ExperienceController = require('../controllers/experiencePointController');

router.post('/Experience', ExperienceController.upsertSettings);

router.get('/Experience', ExperienceController.getSettings);

module.exports = router;
