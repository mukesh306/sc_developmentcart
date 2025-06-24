
const express = require('express');
const router = express.Router();
const schoolController = require('../controllers/schoolController');
const auth = require('../middleware/auth');

router.post('/add', auth, schoolController.addInstitution);

router.get('/School', schoolController.getSchools);
router.get('/college', schoolController.getCollege);
router.get('/institute', schoolController.institute);
router.delete('/School/:id', auth, schoolController.deleteSchool);
router.delete('/college/:id', auth, schoolController.deleteCollege);

router.put('/update/:id', auth, schoolController.updateInstitution);

router.post('/adminInstitution', auth, schoolController.createInstitutionPrice);
router.get('/getAllInstitution', schoolController.getAllInstitution);
router.put('/adminInstitution/:id', schoolController.updateInstitution);
module.exports = router;
