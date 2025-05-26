
const express = require('express');
const router = express.Router();
const MarkingSettingController = require('../controllers/markingSettingCotroller');


router.get('/', MarkingSettingController.getSettings);

router.post('/update', MarkingSettingController.createOrUpdateSettings);


module.exports = router;
