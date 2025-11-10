const express = require("express");
const router = express.Router();
const userExamGroupController = require("../controllers/userexamgroupController")
router.post("/Schooler/usergroupCreate", userExamGroupController.createGroup);
router.get("/Schooler/AlluserExamGroups", userExamGroupController.AlluserExamGroups);
router.put("/Schooler/updateGroup/:groupId", userExamGroupController.updateGroup);
router.delete("/Schooler/deleteGroup/:groupId", userExamGroupController.deleteGroup);
router.get("/Schooler/getAllActiveUsers", userExamGroupController.getAllActiveUsers);

router.get("/Schooler/getUserStates", userExamGroupController.getUserStates);
router.get("/Schooler/getUserCitiesByState", userExamGroupController.getUserCitiesByState);



module.exports = router;
