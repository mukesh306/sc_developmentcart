const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const upload = require('../middleware/upload');
// Signup Route
router.post('/signup', userController.signup);
router.post('/userlogin', userController.Userlogin);
router.post(
    '/complete-profile/:id',
    upload.fields([
      { name: 'aadharCard', maxCount: 1 },
      { name: 'lastYearMarksheet', maxCount: 1 }
    ]),
    userController.completeProfile
  );
module.exports = router;
