const express = require('express');
const router = express.Router();
const contryController = require('../controllers/locationController');
const auth = require('../middleware/auth');

router.post('/location/create',auth,contryController.createLocation);
router.get('/location/getlocation', contryController.getAllLocations);
router.delete('/location/:id', contryController.deleteLocation);
router.put('/location/:id',auth, contryController.updateLocation);
module.exports = router;
