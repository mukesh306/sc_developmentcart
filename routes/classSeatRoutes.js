const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const classSeatController = require('../controllers/classSeatController');

// Create
router.post("/classSeat",auth, classSeatController.createClassSeat);
router.get("/classSeat",auth, classSeatController.getAllClassSeats);
router.post("/buySeat",auth, classSeatController.buyClassSeats);
router.get("/getUserBuys",auth, classSeatController.getUserBuys);
router.get("/filterAvalibleSeat",auth, classSeatController.filterAvalibleSeat);



module.exports = router;
