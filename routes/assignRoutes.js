const express = require('express');
const router = express.Router();
const assignedController = require('../controllers/assignController');
const auth = require('../middleware/auth');
router.post('/assigned',auth, assignedController.createAssigned);

router.get('/assigned', assignedController.getAssignedList);
router.get('/assignedUser',auth, assignedController.getAssignedListUser);

router.delete('/assigned/:id', assignedController.deleteAssigned);
router.put('/assigned/:id', assignedController.updateAssigned);
router.get('/assignedwithClass/:classId', assignedController.getAssignedwithClass);

router.get('/assign-bonus', auth, assignedController.assignBonusPoint);
module.exports = router;