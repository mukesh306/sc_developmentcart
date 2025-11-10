const express = require("express");
const router = express.Router();
const userExamGroupController = require("../controllers/userexamgroupController")
router.post("/Schooler/usergroupCreate", userExamGroupController.createGroup);
router.get("/Schooler/AlluserExamGroups", userExamGroupController.AlluserExamGroups);
router.put("/Schooler/updateGroup/:groupId", userExamGroupController.updateGroup);
router.delete("/Schooler/deleteGroup/:id", userExamGroupController.deleteGroup);
router.get("/Schooler/getAllActiveUsers", userExamGroupController.getAllActiveUsers);

module.exports = router;
