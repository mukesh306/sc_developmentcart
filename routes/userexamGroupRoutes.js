const express = require("express");
const router = express.Router();
const userExamGroupController = require("../controllers/userexamgroupController")
router.post("/Schooler/usergroupCreate", userExamGroupController.createGroup);
router.get("/Schooler/AlluserExamGroups", userExamGroupController.AlluserExamGroups);

module.exports = router;
