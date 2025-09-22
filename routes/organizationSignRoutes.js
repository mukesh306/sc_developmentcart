const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const auth = require('../middleware/auth');
const organizationSignController = require('../controllers/organizationSignController');


router.post('/organization', organizationSignController.createOrganizationSign);
router.get('/organization', organizationSignController.getOrganizationSigns);
router.get('/organizationprofile',auth, organizationSignController.getOrganizationSignById);
router.put('/organization',auth, organizationSignController.updateOrganizationSign);
router.delete('/organization/:id', organizationSignController.deleteOrganizationSign);


router.post("/organization/login", organizationSignController.loginOrganization);
router.post("/organization/verify-otp", organizationSignController.verifySignupOTP);
router.post("/organization/forget-password", organizationSignController.forgetPasswordRequest); 
router.post("/organization/verify-forget-otp", organizationSignController.verifyForgetPasswordOTP); 

router.post("/organization/organizationUser",upload.fields([
      { name: 'aadharCard', maxCount: 1 },
      { name: 'marksheet', maxCount: 1 }
    ]), organizationSignController.organizationUser);


router.get("/organization/organizationUserprofile", organizationSignController.getOrganizationUserProfile);
module.exports = router;
