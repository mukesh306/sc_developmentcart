const express = require('express');
const router = express.Router();
const organizationSignController = require('../controllers/organizationSignController');

router.post('/organization', organizationSignController.createOrganizationSign);
router.get('/organization', organizationSignController.getOrganizationSigns);
router.get('/organization/:id', organizationSignController.getOrganizationSignById);
router.put('/organization/:id', organizationSignController.updateOrganizationSign);
router.delete('/organization/:id', organizationSignController.deleteOrganizationSign);


router.post("/organization/login", organizationSignController.loginOrganization);
router.post("/organization/verify-otp", organizationSignController.verifySignupOTP);


module.exports = router;
