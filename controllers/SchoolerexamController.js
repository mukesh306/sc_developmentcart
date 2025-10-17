const Schoolerexam = require("../models/Schoolerexam");
const School = require("../models/school");      
const College = require("../models/college");
const ExamAnswer = require("../models/examAttempt");
const ExamGroup = require("../models/examGroup");
const User = require("../models/User");
const ExamResult = require("../models/examResult");

exports.createExam = async (req, res) => {
  try {
    const {
      examName,
      category,
      className,
      ScheduleDate,
      ScheduleTime,
      ExamTime,
      Negativemark,
      passout,
      seat,
      topicQuestions
    } = req.body;

    if (!examName || !category || !className || !ScheduleDate || !ScheduleTime || !ExamTime || !seat) {
      return res.status(400).json({ message: "Please fill all required fields." });
    }

    const exam = new Schoolerexam({
      examName,
      category,
      className,
      ScheduleDate,
      ScheduleTime,
      ExamTime,
      Negativemark,
      passout,
      seat,
      topicQuestions,
      createdBy: req.user?._id || req.body.createdBy 
    });

    await exam.save();
    res.status(201).json({ message: "Exam created successfully.", exam });
  } catch (error) {
    console.error("Error creating exam:", error);
    res.status(500).json({ message: "Internal server error.", error });
  }
};


exports.getAllExams = async (req, res) => {
  try {
    let exams = await Schoolerexam.find()
      .populate("category", "name")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

   if (!exams || exams.length === 0) {
      return res.status(200).json([]);
    }

    // ✅ Replace className with data from School or College
    const updatedExams = [];
    for (const exam of exams) {
      let classData =
        (await School.findById(exam.className).select("name className")) ||
        (await College.findById(exam.className).select("name className"));

      // convert to plain JS object to modify safely
      const examObj = exam.toObject();

      if (classData) {
        examObj.className = classData.className || classData.name;
      } else {
        examObj.className = null;
      }
examObj.totalQuestions = exam.topicQuestions ? exam.topicQuestions.length : 0;
      updatedExams.push(examObj);
    }

    res.status(200).json(updatedExams);
  } catch (error) {
    console.error("Error fetching exams:", error);
    res.status(500).json({ message: "Internal server error.", error });
  }
};


exports.getExamById = async (req, res) => {
  try {
    const exam = await Schoolerexam.findById(req.params.id)
      .populate("category", "name")
      .populate("createdBy", "name email");

    if (!exam) {
      return res.status(404).json({ message: "Exam not found." });
    }

    // ✅ Find className from School or College
    let classData =
      (await School.findById(exam.className).select("name className")) ||
      (await College.findById(exam.className).select("name className"));

    const examObj = exam.toObject();

    if (classData) {
      examObj.className = classData.className || classData.name;
    } else {
      examObj.className = null;
    }
examObj.totalQuestions = exam.topicQuestions ? exam.topicQuestions.length : 0;
    res.status(200).json(examObj);
  } catch (error) {
    console.error("Error fetching exam:", error);
    res.status(500).json({ message: "Internal server error.", error });
  }
};

exports.updateExam = async (req, res) => {
  try {
    const updatedExam = await Schoolerexam.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedExam) return res.status(404).json({ message: "Exam not found." });

    res.status(200).json({ message: "Exam updated successfully.", updatedExam });
  } catch (error) {
    console.error("Error updating exam:", error);
    res.status(500).json({ message: "Internal server error.", error });
  }
};

// ✅ Delete exam
exports.deleteExam = async (req, res) => {
  try {
    const deletedExam = await Schoolerexam.findByIdAndDelete(req.params.id);
    if (!deletedExam) return res.status(404).json({ message: "Exam not found." });

    res.status(200).json({ message: "Exam deleted successfully." });
  } catch (error) {
    console.error("Error deleting exam:", error);
    res.status(500).json({ message: "Internal server error.", error });
  }
};


// ✅ Add new questions to an existing exam
exports.addQuestionsToExam = async (req, res) => {
  try {
    const { examId } = req.params;
    const { topicQuestions } = req.body;

    if (!topicQuestions || !Array.isArray(topicQuestions) || topicQuestions.length === 0) {
      return res.status(400).json({ message: "Please provide at least one question." });
    }

    // Find exam
    const exam = await Schoolerexam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found." });
    }

    // Push new questions to existing array
    exam.topicQuestions.push(...topicQuestions);

    await exam.save();

    res.status(200).json({
      message: "Questions added successfully.",
      totalQuestions: exam.topicQuestions.length,
      exam,
    });
  } catch (error) {
    console.error("Error adding questions:", error);
    res.status(500).json({ message: "Internal server error.", error });
  }
};


exports.submitExamAnswer = async (req, res) => {
  try {
    const userId = req.user._id;
    const { examId, questionId, selectedAnswer, attemptId } = req.body;

    if (!examId || !questionId || !attemptId) {
      return res.status(400).json({ message: "examId, questionId, and attemptId are required." });
    }

    const exam = await Schoolerexam.findById(examId);
    if (!exam) return res.status(404).json({ message: "Exam not found." });

    // Save / update answer
    await ExamAnswer.findOneAndUpdate(
      { userId, examId, questionId, attemptId },
      { selectedAnswer },
      { upsert: true, new: true }
    );

    const groupSize = exam.seat;

    // Find the last group (highest groupNumber) for this exam
    let lastGroup = await ExamGroup.findOne({ examId })
      .sort({ groupNumber: -1 });

    if (!lastGroup || lastGroup.members.length >= groupSize) {
      // Create a new group
      lastGroup = await ExamGroup.create({
        examId,
        groupNumber: lastGroup ? lastGroup.groupNumber + 1 : 1,
        members: [userId],
      });
    } else {
      // Add user to the last group
      if (!lastGroup.members.includes(userId)) {
        lastGroup.members.push(userId);
        await lastGroup.save();
      }
    }

    return res.status(200).json({
      message: "Answer saved successfully.",
      attemptId,
      groupNumber: lastGroup.groupNumber,
      membersInGroup: lastGroup.members.length
    });
  } catch (error) {
    console.error("Error in submitExamAnswer:", error);
    res.status(500).json({ message: "Internal server error.", error: error.message });
  }
};
exports.calculateExamResult = async (req, res) => {
  try {
    const userId = req.user._id;
    const { examId, attemptId } = req.body;

    const exam = await Schoolerexam.findById(examId);
    if (!exam) return res.status(404).json({ message: "Exam not found." });

    const answers = await ExamAnswer.find({ userId, examId, attemptId });
    if (answers.length === 0)
      return res.status(400).json({ message: "No answers found for this attempt." });

    let correct = 0,
      wrong = 0,
      total = exam.topicQuestions.length;

    for (const ans of answers) {
      const question = exam.topicQuestions.find(
        q => q._id.toString() === ans.questionId.toString()
      );

      if (question) {
        // Map selected option key to its value
        const selectedValue = question[ans.selectedAnswer]?.trim().toLowerCase();
        const correctAnswer = question.answer?.trim().toLowerCase();

        if (selectedValue === correctAnswer) correct++;
        else if (ans.selectedAnswer) wrong++;
      }
    }

    const negative = wrong * (parseFloat(exam.Negativemark) || 0);
    const finalScore = Math.max(correct - negative, 0);
    const result = finalScore >= exam.passout ? "pass" : "fail";

    const examResult = await ExamResult.findOneAndUpdate(
      { userId, examId, attemptId },
      {
        userId,
        examId,
        attemptId,
        totalQuestions: total,
        correct,
        wrong,
        negativeMarks: negative,
        finalScore,
        result,
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      message: "Result calculated and saved successfully.",
      examResult,
    });
  } catch (error) {
    console.error("Error calculating exam result:", error);
    res.status(500).json({ message: "Internal server error.", error: error.message });
  }
};



exports.getTopUsersPerGroup = async (req, res) => {
  try {
    const { examId } = req.body;
    if (!examId) return res.status(400).json({ message: "examId required." });

    // 1️⃣ Fetch the exam to get the passout value
    const exam = await Schoolerexam.findById(examId);
    if (!exam) return res.status(404).json({ message: "Exam not found." });

    const passoutLimit = parseInt(exam.passout) || 1; // default 1 if not set

    // 2️⃣ Get all groups for this exam
    const groups = await ExamGroup.find({ examId })
      .populate("members", "firstName lastName email");

    if (!groups || groups.length === 0)
      return res.status(404).json({ message: "No groups found for this exam." });

    const result = [];

    // 3️⃣ Loop through each group and fetch top scorers
    for (const group of groups) {
      const memberIds = group.members.map(m => m._id);

      // Get exam results for this group's members, sorted by score descending
      const scores = await ExamResult.find({
        examId,
        userId: { $in: memberIds },
      })
        .populate("userId", "firstName lastName email")
        .sort({ finalScore: -1 });

      // Pick top N (N = exam.passout)
      const topUsers = scores.slice(0, passoutLimit);

      result.push({
        groupNumber: group.groupNumber,
        topUsers,
      });
    }

    return res.status(200).json({
      message: "Top users per group fetched successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Error in getTopUsersPerGroup:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};



exports.getAllExamGroups = async (req, res) => {
  try {
    const examGroups = await ExamGroup.find()
      .populate('examId', 'name') // populate exam name
      .populate('members', 'firstName lastName email') // populate user info
      .sort({ createdAt: -1 }); // latest first

    if (!examGroups || examGroups.length === 0) {
      return res.status(404).json({ message: 'No exam groups found.' });
    }

    res.status(200).json({ success: true, examGroups });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};
