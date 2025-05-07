
const express = require('express');
const router = express.Router();
const schoolController = require('../controllers/schoolController');
const auth = require('../middleware/auth');

router.post('/School', auth, schoolController.addSchool);
router.get('/School', schoolController.getSchools);
router.delete('/School/:id', auth, schoolController.deleteSchool);
router.put('/School/:id', auth, schoolController.updateSchool);
module.exports = router;
