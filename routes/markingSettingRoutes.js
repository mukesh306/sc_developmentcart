
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const MarkingSettingController = require('../controllers/markingSettingCotroller');


router.get('/marking', MarkingSettingController.getSettings);
router.get('/bufferTime', MarkingSettingController.bufferTime);

router.post('/marking',auth, MarkingSettingController.createOrUpdateSettings);


module.exports = router;
