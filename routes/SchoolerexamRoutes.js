const express = require("express");
const router = express.Router();
const SchoolerexamController = require("../controllers/SchoolerexamController");
const auth = require('../middleware/auth');

router.post("/schooler/createExam", auth, SchoolerexamController.createExam);
router.get("/schooler/getAllExams", SchoolerexamController.getAllExams);

router.get("/schooler/getExam/:id", SchoolerexamController.getExamById);
router.put("/schooler/updateExam/:id", auth, SchoolerexamController.updateExam);
router.delete("/schooler/deleteExam/:id", auth, SchoolerexamController.deleteExam);

router.get("/schooler/UsersExams",auth, SchoolerexamController.UsersExams);
router.post("/schooler/submitExamAnswer", auth, SchoolerexamController.submitExamAnswer);
router.post("/schooler/calculateExamResult", auth, SchoolerexamController.calculateExamResult);
router.post("/schooler/getTopUsersPerGroup", SchoolerexamController.getTopUsersPerGroup);

router.get('/schooler/groupall', SchoolerexamController.getAllExamGroups);

router.post(
  "/schooler/addQuestions/:examId",
  auth,
  SchoolerexamController.addQuestionsToExam
);

module.exports = router;
