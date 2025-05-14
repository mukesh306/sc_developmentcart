const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const User = require('../models/User');
// Signup Route   
router.post('/signup', userController.signup);
router.put('/updateUser',auth, userController.updateUser);
router.post('/userlogin', userController.Userlogin);

router.post(
    '/complete-profile',
    auth,upload.fields([
      { name: 'aadharCard', maxCount: 1 },
      { name: 'marksheet', maxCount: 1 }
    ]),
    userController.completeProfile
  );

  router.put(
    '/update-profile',
    auth,upload.fields([
      { name: 'aadharCard', maxCount: 1 },
      { name: 'marksheet', maxCount: 1 }
    ]),
    userController.updateProfile
  );
  router.get('/getUserProfile',auth, userController.getUserProfile);
   router.post('/send-reset-otp', userController.sendResetOTP);
   router.post('/login-with-otp',userController.loginWithOTP);
    router.post('/reset-password-after-otp',userController.resetPasswordAfterOTPLogin);

// EmailverifytOTP
  router.post('/sendEmailverify', userController.SendEmailverifyOTP);
    router.post('/emailverifyotp', userController.EmailVerifyOtp);

router.get('/verify-token', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: "no", message: "Token not provided properly." });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.status(200).json({
      status: "yes",
      message: "Token is valid.",
      userId: decoded.id
    });
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return res.status(401).json({
      status: "no",
      message: "Token invalid or expired.",
      error: err.message  
    });
  }
});
module.exports = router;

