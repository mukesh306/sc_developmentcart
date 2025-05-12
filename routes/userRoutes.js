const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
// Signup Route
router.post('/signup', userController.signup);
router.post('/userlogin', userController.Userlogin);
router.post(
    '/complete-profile',
    auth,upload.fields([
      { name: 'aadharCard', maxCount: 1 },
      { name: 'marksheet', maxCount: 1 }
    ]),
    userController.completeProfile
  );


  router.get('/getUserProfile',auth, userController.getUserProfile);
   router.post('/send-reset-otp', userController.sendResetOTP);
   router.post('/login-with-otp',userController.loginWithOTP);
    router.post('/reset-password-after-otp',userController.resetPasswordAfterOTPLogin);
module.exports = router;

