
const express = require('express');
const router = express.Router();
const MarkingSettingController = require('../controllers/markingSettingCotroller');


router.get('/marking', MarkingSettingController.getSettings);

router.post('/marking', MarkingSettingController.createOrUpdateSettings);


module.exports = router;
