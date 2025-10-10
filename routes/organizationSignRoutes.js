const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
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
router.post("/organization/reset-password", auth,organizationSignController.resetPassword);
router.post("/organization/bulk-upload", auth,organizationSignController.bulkUploadOrganizationUsers);

router.post("/organization/organizationUser",auth,upload.fields([
      { name: 'aadharCard', maxCount: 1 },
      { name: 'marksheet', maxCount: 1 }
    ]), organizationSignController.organizationUser);

router.get("/organization/organizationUserprofile",auth, organizationSignController.getOrganizationUserProfile);

router.put("/organization/organizationUser", upload.fields([
  { name: 'aadharCard', maxCount: 1 },
  { name: 'marksheet', maxCount: 1 }
]), organizationSignController.updateOrganizationUser);

router.delete("/organization/organizationUser/:userId", organizationSignController.deleteOrganizationUser);

router.get(
  "/organization/organizationUser/:id",
 
  organizationSignController.getOrganizationUserById
);

router.post("/organization/invite", organizationSignController.inviteUsers);


router.get('/organization/verify-token', (req, res) => {
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
