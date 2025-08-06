const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const auth = require('../middleware/auth');



router.post('/register', authController.register);
router.post('/login', authController.login);

router.post('/verify-otp', authController.verifyOtp);

//admin

router.post('/admincreate',adminController.registerAdmin);
router.post('/adminlogin', adminController.loginAdmin);
router.get('/getAllAdmins', adminController.getAllAdmins);
router.delete('/deleteAdmins/:id', adminController.deleteAdmin);
router.post('/verifyotp', adminController.verifyOtp);
router.put('/updateAdmin/:id', auth, adminController.updateAdmin);

module.exports = router;