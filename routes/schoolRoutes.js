
const express = require('express');
const router = express.Router();
const schoolController = require('../controllers/schoolController');
const auth = require('../middleware/auth');

router.post('/add', auth, schoolController.addInstitution);
router.get('/School', schoolController.getSchools);
router.get('/college', schoolController.getCollege);
router.get('/institute', schoolController.institute);
router.delete('/School/:id', auth, schoolController.deleteSchool);
router.put('/School/:id', auth, schoolController.updateInstitution);
module.exports = router;
