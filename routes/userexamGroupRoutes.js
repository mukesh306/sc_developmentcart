const express = require("express");
const router = express.Router();
const auth = require('../middleware/auth');
const userExamGroupController = require("../controllers/userexamgroupController")
router.post("/Schooler/usergroupCreate", auth,userExamGroupController.createGroup);
router.get("/Schooler/AlluserExamGroups", auth,userExamGroupController.AlluserExamGroups);
router.put("/Schooler/updateGroup/:groupId", userExamGroupController.updateGroup);
router.delete("/Schooler/deleteGroup/:groupId", userExamGroupController.deleteGroup);
router.get("/Schooler/groupMembers/:groupId", userExamGroupController.getGroupMembers);

router.get("/Schooler/getAllActiveUsers", userExamGroupController.getAllActiveUsers);

router.get("/Schooler/getUserStates", userExamGroupController.getUserStates);
router.get("/Schooler/getUserCitiesByState", userExamGroupController.getUserCitiesByState);



module.exports = router;
