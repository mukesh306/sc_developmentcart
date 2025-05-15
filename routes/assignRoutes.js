const express = require('express');
const router = express.Router();
const assignedController = require('../controllers/assignController');
const auth = require('../middleware/auth');
router.post('/assigned',auth, assignedController.createAssigned);
router.get('/assigned', assignedController.getAssignedList);

module.exports = router;