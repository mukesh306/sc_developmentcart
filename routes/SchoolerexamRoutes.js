const express = require("express");
const router = express.Router();
const SchoolerexamController = require("../controllers/SchoolerexamController");
const auth = require('../middleware/auth');

router.post("/schooler/createExam", auth, SchoolerexamController.createExam);
router.get("/schooler/getAllExams", SchoolerexamController.getAllExams);

router.get("/schooler/getExam/:id", SchoolerexamController.getExamById);

router.put("/schooler/updateExam/:id", auth, SchoolerexamController.updateExam);

router.put("/schooler/publishExam/:id", SchoolerexamController.publishExam);

router.delete("/schooler/deleteExam/:id", auth, SchoolerexamController.deleteExam);
router.post("/schooler/assignGroup", SchoolerexamController.assignGroupToExam);


router.get("/schooler/UsersExams",auth, SchoolerexamController.UsersExams);
router.get("/schooler/ExamQuestion/:id", SchoolerexamController.ExamQuestion);
router.post("/schooler/submitExamAnswer", auth, SchoolerexamController.submitExamAnswer);
router.post("/schooler/calculateExamResult", auth, SchoolerexamController.calculateExamResult);
router.get("/schooler/Leaderboard/:id",auth, SchoolerexamController.Leaderboard);
router.get("/schooler/topusers/:id", SchoolerexamController.topusers);
router.get('/schooler/groupall', SchoolerexamController.getAllExamGroups);

router.get('/schooler/SchoolerShipPrizes',auth, SchoolerexamController.schoolerShipPrizes);

router.post(
  "/schooler/addQuestions/:examId",
  auth,
  SchoolerexamController.addQuestionsToExam
);

module.exports = router;
