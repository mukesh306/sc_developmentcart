
const express = require('express');
const router = express.Router();
const collegeController = require('../controllers/collegeController');

const auth = require('../middleware/auth');

router.post('/College', auth, collegeController.addCollege);
router.get('/College', collegeController.getCollege);
router.delete('/College/:id', auth, collegeController.deleteCollege);
router.put('/College/:id', auth, collegeController.updateCollege);

router.get('/institute', collegeController.institute);
module.exports = router;
