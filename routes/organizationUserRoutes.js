const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const organizationUserController = require('../controllers/organizationuserController');

router.post('/organizationUser', upload.fields([
      { name: 'aadharCard', maxCount: 1 },
      { name: 'marksheet', maxCount: 1 }
    ]), organizationUserController.register);


module.exports = router;
