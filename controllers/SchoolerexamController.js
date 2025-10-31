const Schoolerexam = require("../models/Schoolerexam");
const School = require("../models/school");      
const College = require("../models/college");
const ExamAnswer = require("../models/examAttempt");
const ExamGroup = require("../models/examGroup");
const User = require("../models/User");
const ExamResult = require("../models/examResult");
const Schoolercategory = require("../models/schoolershipcategory");


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



// exports.getAllExams = async (req, res) => {
//   try {
//     let exams = await Schoolerexam.find()
//       .populate("category", "name")
//       .populate("createdBy", "name email")
//       .sort({ createdAt: -1 });

//     if (!exams || exams.length === 0) {
//       return res.status(200).json([]);
//     }

//     const updatedExams = [];

//     for (const exam of exams) {
//       // Try fetching from School or College
//       let classData =
//         (await School.findById(exam.className).select("_id name className")) ||
//         (await College.findById(exam.className).select("_id name className"));

//       const examObj = exam.toObject();

//       if (classData) {
//         examObj.className = {
//           _id: classData._id,
//           name: classData.className || classData.name,
//         };
//       } else {
//         examObj.className = null;
//       }

//       examObj.totalQuestions = exam.topicQuestions
//         ? exam.topicQuestions.length
//         : 0;

//       updatedExams.push(examObj);
//     }

//     res.status(200).json(updatedExams);
//   } catch (error) {
//     console.error("Error fetching exams:", error);
//     res.status(500).json({ message: "Internal server error.", error });
//   }
// };



exports.getAllExams = async (req, res) => {
  try {
    const { category, className } = req.query;

    // ✅ Step 1: Fetch all exams first
    let exams = await Schoolerexam.find()
      .populate("category", "name")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    if (!exams || exams.length === 0) {
      return res.status(200).json([]);
    }

    const updatedExams = [];

    // ✅ Step 2: Build data with class info and filtering logic
    for (const exam of exams) {
      let classData =
        (await School.findById(exam.className).select("_id name className")) ||
        (await College.findById(exam.className).select("_id name className"));

      const examObj = exam.toObject();

      if (classData) {
        examObj.className = {
          _id: classData._id,
          name: classData.className || classData.name,
        };
      } else {
        examObj.className = null;
      }

      examObj.totalQuestions = exam.topicQuestions
        ? exam.topicQuestions.length
        : 0;

      updatedExams.push(examObj);
    }

    // ✅ Step 3: Apply filter on final objects
    let filteredExams = updatedExams;

    if (category) {
      filteredExams = filteredExams.filter(
        (e) => e.category && e.category._id?.toString() === category
      );
    }

    if (className) {
      filteredExams = filteredExams.filter(
        (e) => e.className && e.className._id?.toString() === className
      );
    }

    res.status(200).json(filteredExams);
  } catch (error) {
    console.error("🔥 Error fetching exams:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
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

exports.publishExam = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if exam exists
    const exam = await Schoolerexam.findById(id);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found." });
    }

    // Update publish to true
    exam.publish = true;
    await exam.save();

    res.status(200).json({
      message: "Exam published successfully.",
    });
  } catch (error) {
    console.error("Error publishing exam:", error);
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



// exports.UsersExams = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { category } = req.query;

//     // 1️⃣ Get user class
//     const user = await User.findById(userId).select("className");
//     if (!user || !user.className) {
//       return res.status(400).json({ message: "User class not found." });
//     }

//     // 2️⃣ Get all published exams of user class (sorted by order)
//     let exams = await Schoolerexam.find({
//       className: user.className,
//       publish: true,
//     })
//       .populate("category", "name finalist")
//       .populate("createdBy", "name email")
//       .sort({ createdAt: 1 }); // oldest first (Exam 1 → Exam 2 → Exam 3...)

//     if (!exams || exams.length === 0) {
//       return res.status(200).json([]);
//     }

//     const updatedExams = [];

//     // 3️⃣ Prepare exams info with rank/result
//     for (const exam of exams) {
//       let classData =
//         (await School.findById(exam.className).select("_id name className")) ||
//         (await College.findById(exam.className).select("_id name className"));

//       const examObj = exam.toObject();
//       examObj.className = classData
//         ? { _id: classData._id, name: classData.className || classData.name }
//         : null;

//       examObj.totalQuestions = exam.topicQuestions
//         ? exam.topicQuestions.length
//         : 0;

//       const userResult = await ExamResult.findOne({
//         userId,
//         examId: exam._id,
//       })
//         .select("correct finalScore percentage createdAt")
//         .lean();

//       examObj.correct = userResult ? userResult.correct : null;
//       examObj.finalScore = userResult ? userResult.finalScore : null;

//       if (userResult && examObj.totalQuestions > 0) {
//         examObj.percentage = parseFloat(
//           ((userResult.finalScore / examObj.totalQuestions) * 100).toFixed(2)
//         );
//       } else {
//         examObj.percentage = null;
//       }

//       if (userResult) {
//         const allResults = await ExamResult.find({ examId: exam._id })
//           .select("userId percentage createdAt")
//           .sort({ percentage: -1, createdAt: 1 })
//           .lean();

//         let rank = null;
//         for (let i = 0; i < allResults.length; i++) {
//           if (allResults[i].userId.toString() === userId.toString()) {
//             rank = i + 1;
//             break;
//           }
//         }

//         examObj.rank = rank;
//         examObj.totalParticipants = allResults.length;
//       } else {
//         examObj.rank = null;
//         examObj.totalParticipants = 0;
//       }

//       examObj.status =
//         examObj.percentage !== null && examObj.percentage >= 0 ? true : false;
//       examObj.publish = exam.publish;

//       updatedExams.push(examObj);
//     }

//     // 4️⃣ Category filter (optional)
//     let filteredExams = updatedExams;
//     if (category) {
//       filteredExams = filteredExams.filter(
//         (e) => e.category && e.category._id?.toString() === category
//       );
//     }

//     // 5️⃣ Visibility logic (Exam progression chain)
//     let visibleExams = [];

//     for (let i = 0; i < filteredExams.length; i++) {
//       const currentExam = filteredExams[i];

//       if (i === 0) {
//         // ✅ Exam 1 — visible to all
//         visibleExams.push(currentExam);
//       } else {
//         const previousExam = filteredExams[i - 1];
//         const passoutLimit = parseInt(previousExam.passout) || 1;

//         // Get top users from previous exam
//         const topResults = await ExamResult.find({ examId: previousExam._id })
//           .sort({ percentage: -1, createdAt: 1 })
//           .limit(passoutLimit)
//           .select("userId")
//           .lean();

//         const topUserIds = topResults.map((r) => r.userId.toString());

//         // ✅ Show current exam only if user is topper of previous exam
//         if (topUserIds.includes(userId.toString())) {
//           visibleExams.push(currentExam);
//         } else {
//           break; // ❌ Stop chain if user not topper — no further exams visible
//         }
//       }
//     }

//     // ✅ Final response
//     return res.status(200).json(visibleExams);
//   } catch (error) {
//     console.error("🔥 Error fetching exams:", error);
//     res.status(500).json({
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };


exports.UsersExams = async (req, res) => {
  try {
    const userId = req.user._id;
    const { category } = req.query;

    // 1️⃣ Get user's class
    const user = await User.findById(userId).select("className");
    if (!user || !user.className) {
      return res.status(400).json({ message: "User class not found." });
    }

    // 2️⃣ Get all published exams (sorted oldest → newest)
    let exams = await Schoolerexam.find({
      className: user.className,
      publish: true,
    })
      .populate("category", "name createdAt")
      .populate("createdBy", "name email")
      .sort({ createdAt: 1 })
      .lean();

    if (!exams.length) return res.status(200).json([]);

    const updatedExams = [];
    let userStillTopper = true; // 🔒 if false, stop chain

    for (let i = 0; i < exams.length; i++) {
      const exam = exams[i];
      const examObj = { ...exam };

      // 🧩 Add total questions
      examObj.totalQuestions = exam.topicQuestions?.length || 0;

      // 🧩 Get user result for this exam
      const userResult = await ExamResult.findOne({
        userId,
        examId: exam._id,
      })
        .select("correct finalScore percentage createdAt")
        .lean();

      examObj.correct = userResult ? userResult.correct : null;
      examObj.finalScore = userResult ? userResult.finalScore : null;

      if (userResult && examObj.totalQuestions > 0) {
        examObj.percentage = parseFloat(
          ((userResult.finalScore / examObj.totalQuestions) * 100).toFixed(2)
        );
      } else {
        examObj.percentage = null;
      }

      // 🧩 Get rank + total participants
      if (userResult) {
        const allResults = await ExamResult.find({ examId: exam._id })
          .select("userId percentage createdAt")
          .sort({ percentage: -1, createdAt: 1 })
          .lean();

        const rankIndex = allResults.findIndex(
          (r) => r.userId.toString() === userId.toString()
        );

        examObj.rank = rankIndex !== -1 ? rankIndex + 1 : null;
        examObj.totalParticipants = allResults.length;
      } else {
        examObj.rank = null;
        examObj.totalParticipants = 0;
      }

      // 🧩 Status = attempted or not
      examObj.status =
        examObj.percentage !== null && examObj.percentage >= 0 ? true : false;

      // 🧩 Default visibility (first exam always visible)
      if (i === 0) {
        examObj.visible = true;
        updatedExams.push(examObj);
        continue;
      }

      // 🔙 Previous exam
      const prevExam = updatedExams[updatedExams.length - 1];

      if (!userStillTopper) {
        examObj.visible = false;
        updatedExams.push(examObj);
        continue;
      }

      // 🧩 Check if user was topper in previous exam
      const passLimit = parseInt(prevExam.passout) || 1;
      const topResults = await ExamResult.find({ examId: prevExam._id })
        .sort({ percentage: -1, createdAt: 1 })
        .limit(passLimit)
        .select("userId")
        .lean();

      const topUserIds = topResults.map((r) => r.userId.toString());

      if (topUserIds.includes(userId.toString())) {
        examObj.visible = true; // ✅ unlock next
      } else {
        examObj.visible = false; // ❌ stop chain
        userStillTopper = false;
      }

      updatedExams.push(examObj);
    }

    // 3️⃣ Filter only visible exams
    let visibleExams = updatedExams.filter((e) => e.visible);

    // 4️⃣ Optional frontend category filter
    if (category) {
      visibleExams = visibleExams.filter(
        (e) => e.category && e.category._id.toString() === category
      );
    }

    // ✅ Final response
    res.status(200).json(visibleExams);
  } catch (error) {
    console.error("🔥 Error fetching exams:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};



exports.ExamQuestion = async (req, res) => {
  try {
    const exam = await Schoolerexam.findById(req.params.id)
      .populate("category", "name") 
      .select("examName ExamTime category topicQuestions"); 

    if (!exam) {
      return res.status(404).json({ message: "Exam not found." });
    }

    // ✅ Format clean response
    const response = {
      examName: exam.examName,
      ExamTime: exam.ExamTime,
      categoryName: exam.category ? exam.category.name : null, // ✅ Only category name
      topicQuestions: exam.topicQuestions || []
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching exam:", error);
    res.status(500).json({ message: "Internal server error.", error: error.message });
  }
};



// exports.submitExamAnswer = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { examId, questionId, selectedAnswer, attemptId } = req.body;

//     if (!examId || !questionId || !attemptId) {
//       return res.status(400).json({ message: "examId, questionId, and attemptId are required." });
//     }

//     const exam = await Schoolerexam.findById(examId);
//     if (!exam) return res.status(404).json({ message: "Exam not found." });

//     // Save / update answer
//     await ExamAnswer.findOneAndUpdate(
//       { userId, examId, questionId, attemptId },
//       { selectedAnswer },
//       { upsert: true, new: true }
//     );

//     const groupSize = exam.seat;

//     // Find the last group (highest groupNumber) for this exam
//     let lastGroup = await ExamGroup.findOne({ examId })
//       .sort({ groupNumber: -1 });

//     if (!lastGroup || lastGroup.members.length >= groupSize) {
//       // Create a new group
//       lastGroup = await ExamGroup.create({
//         examId,
//         groupNumber: lastGroup ? lastGroup.groupNumber + 1 : 1,
//         members: [userId],
//       });
//     } else {
//       // Add user to the last group
//       if (!lastGroup.members.includes(userId)) {
//         lastGroup.members.push(userId);
//         await lastGroup.save();
//       }
//     }

//     return res.status(200).json({
//       message: "Answer saved successfully.",
//       attemptId,
//       groupNumber: lastGroup.groupNumber,
//       membersInGroup: lastGroup.members.length
//     });
//   } catch (error) {
//     console.error("Error in submitExamAnswer:", error);
//     res.status(500).json({ message: "Internal server error.", error: error.message });
//   }
// };



exports.submitExamAnswer = async (req, res) => {
  try {
    const userId = req.user._id;
    const { examId, questionId, selectedAnswer, attemptId } = req.body;

    if (!examId || !questionId || !attemptId) {
      return res.status(400).json({ message: "examId, questionId, and attemptId are required." });
    }

    const exam = await Schoolerexam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found." });
    }

    // ✅ Auto-detect skip
    const isSkipped = !selectedAnswer || selectedAnswer === "";

    // ✅ Save / update answer
    await ExamAnswer.findOneAndUpdate(
      { userId, examId, questionId, attemptId },
      { 
        selectedAnswer: isSkipped ? null : selectedAnswer,
        skipped: isSkipped 
      },
      { upsert: true, new: true }
    );

    const groupSize = exam.seat;

    // ✅ Find the last group (highest groupNumber)
    let lastGroup = await ExamGroup.findOne({ examId }).sort({ groupNumber: -1 });

    if (!lastGroup || lastGroup.members.length >= groupSize) {
      // ✅ Create new group
      lastGroup = await ExamGroup.create({
        examId,
        groupNumber: lastGroup ? lastGroup.groupNumber + 1 : 1,
        members: [userId],
      });
    } else {
      // ✅ Add user to existing group if not already
      if (!lastGroup.members.includes(userId)) {
        lastGroup.members.push(userId);
        await lastGroup.save();
      }
    }

    return res.status(200).json({
      message: isSkipped ? "Question skipped successfully." : "Answer saved successfully.",
      attemptId,
      groupNumber: lastGroup.groupNumber,
      membersInGroup: lastGroup.members.length,
    });
  } catch (error) {
    console.error("Error in submitExamAnswer:", error);
    res.status(500).json({ message: "Internal server error.", error: error.message });
  }
};



// exports.calculateExamResult = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { examId, attemptId } = req.body;

//     const exam = await Schoolerexam.findById(examId);
//     if (!exam) return res.status(404).json({ message: "Exam not found." });

//     const answers = await ExamAnswer.find({ userId, examId, attemptId });
//     if (answers.length === 0)
//       return res.status(400).json({ message: "No answers found for this attempt." });

//     let correct = 0,
//         wrong = 0,
//         skippedCount = 0,
//         total = exam.topicQuestions.length;

//     for (const ans of answers) {
//       const question = exam.topicQuestions.find(
//         q => q._id.toString() === ans.questionId.toString()
//       );

//       if (question) {
//         if (ans.skipped === true || ans.selectedAnswer === null || ans.selectedAnswer === "") {
//           skippedCount++;
//           continue;
//         }

//         if (ans.selectedAnswer === question.answer) correct++;
//         else wrong++;
//       }
//     }

//     const negative = wrong * (parseFloat(exam.Negativemark) || 0);
//     const finalScore = Math.max(correct - negative, 0);

//     const attempted = total - skippedCount;
//     const percentage = attempted > 0 ? (finalScore / total) * 100 : 0;
//     const result = finalScore >= exam.passout ? "pass" : "fail";

//     const examResult = await ExamResult.findOneAndUpdate(
//       { userId, examId, attemptId },
//       {
//         userId,
//         examId,
//         attemptId,
//         totalQuestions: total,
//         attempted,
//         skipped: skippedCount,
//         correct,
//         wrong,
//         negativeMarks: negative,
//         finalScore,
//         percentage: parseFloat(percentage.toFixed(2)),
//         result,
//       },
//       { upsert: true, new: true }
//     );

//     // ✅ Custom response field mapping
//     const formattedResponse = {
//       _id: examResult._id,
//       examId: examResult.examId,
//       attemptId: examResult.attemptId,
//       userId: examResult.userId,
//       totalQuestions: examResult.totalQuestions,
//       correctAnswers: examResult.correct,
//       incorrectAnswers: examResult.wrong,
//       skipped: examResult.skipped,
//       negativeMarking: examResult.negativeMarks,
//       totalMarks: examResult.finalScore,
//       scorePercent: examResult.percentage,
//       result: examResult.result,
//       maxMarkPerQuestion: 1,
//       createdAt: examResult.createdAt,
//     };

//     return res.status(200).json({
//       message: "Result calculated and saved successfully.",
//       examResult: formattedResponse,
//     });
//   } catch (error) {
//     console.error("Error calculating exam result:", error);
//     res.status(500).json({ message: "Internal server error.", error: error.message });
//   }
// };

exports.calculateExamResult = async (req, res) => {
  try {
    const userId = req.user._id;
    const { examId, attemptId, Completiontime } = req.body;

    const exam = await Schoolerexam.findById(examId);
    if (!exam) return res.status(404).json({ message: "Exam not found." });

    const answers = await ExamAnswer.find({ userId, examId, attemptId });
    if (answers.length === 0)
      return res.status(400).json({ message: "No answers found for this attempt." });

    let correct = 0,
      wrong = 0,
      skippedCount = 0,
      total = exam.topicQuestions.length;

    for (const ans of answers) {
      const question = exam.topicQuestions.find(
        q => q._id.toString() === ans.questionId.toString()
      );

      if (question) {
        if (ans.skipped === true || ans.selectedAnswer === null || ans.selectedAnswer === "") {
          skippedCount++;
          continue;
        }

        if (ans.selectedAnswer === question.answer) correct++;
        else wrong++;
      }
    }

    const negative = wrong * (parseFloat(exam.Negativemark) || 0);
    const finalScore = Math.max(correct - negative, 0);

    const attempted = total - skippedCount;
    const percentage = attempted > 0 ? (finalScore / total) * 100 : 0;
    const result = finalScore >= exam.passout ? "pass" : "fail";

    const examResult = await ExamResult.findOneAndUpdate(
      { userId, examId, attemptId },
      {
        userId,
        examId,
        attemptId,
        totalQuestions: total,
        attempted,
        skipped: skippedCount,
        correct,
        wrong,
        negativeMarks: negative,
        finalScore,
        percentage: parseFloat(percentage.toFixed(2)),
        result,
        Completiontime, // ✅ Added field to save completion time
      },
      { upsert: true, new: true }
    );

    // ✅ Custom response field mapping
    const formattedResponse = {
      _id: examResult._id,
      examId: examResult.examId,
      attemptId: examResult.attemptId,
      userId: examResult.userId,
      totalQuestions: examResult.totalQuestions,
      correctAnswers: examResult.correct,
      incorrectAnswers: examResult.wrong,
      skipped: examResult.skipped,
      negativeMarking: examResult.negativeMarks,
      totalMarks: examResult.finalScore,
      scorePercent: examResult.percentage,
      result: examResult.result,
      maxMarkPerQuestion: 1,
      Completiontime: examResult.Completiontime, // ✅ Include in response too
      createdAt: examResult.createdAt,
    };

    return res.status(200).json({
      message: "Result calculated and saved successfully.",
      examResult: formattedResponse,
    });
  } catch (error) {
    console.error("Error calculating exam result:", error);
    res.status(500).json({ message: "Internal server error.", error: error.message });
  }
};




exports.topusers = async (req, res) => {
  try {
    const examId = req.params.id;

    if (!examId) return res.status(400).json({ message: "examId required." });

    // 1️⃣ Get exam for passout limit
    const exam = await Schoolerexam.findById(examId);
    if (!exam) return res.status(404).json({ message: "Exam not found." });

    const passoutLimit = parseInt(exam.passout) || 1;

    // 2️⃣ Get all groups with members
    const groups = await ExamGroup.find({ examId }).populate("members", "firstName lastName email");

    if (!groups || groups.length === 0) {
      return res.status(200).json({
        message: "No groups found for this exam.",
        users: [],
      });
    }

    let allUsers = [];

    // 3️⃣ Collect top users from each group
    for (const group of groups) {
      const memberIds = group.members.map((m) => m._id);

      const scores = await ExamResult.find({
        examId,
        userId: { $in: memberIds },
      })
        .populate("userId", "firstName lastName email")
        .sort({ finalScore: -1 });

      const topUsers = scores.slice(0, passoutLimit);
      allUsers.push(...topUsers);
    }

    // ✅ Remove duplicate users if any
    const uniqueUsers = [];
    const seen = new Set();

    for (const user of allUsers) {
      const userId = user.userId?._id?.toString();
      if (userId && !seen.has(userId)) {
        seen.add(userId);
        uniqueUsers.push(user);
      }
    }

    // ✅ Rank calculation based on percentage
    const allResults = await ExamResult.find({ examId })
      .select("userId percentage createdAt")
      .sort({ percentage: -1, createdAt: 1 })
      .lean();

    const ranks = new Map();
    allResults.forEach((result, index) => {
      ranks.set(result.userId.toString(), index + 1);
    });

    // ✅ Attach rank and Completiontime
    for (let i = 0; i < uniqueUsers.length; i++) {
      const userId = uniqueUsers[i].userId?._id?.toString();
      const rank = ranks.get(userId) || null;

      uniqueUsers[i]._doc = {
        ...uniqueUsers[i]._doc,
        rank,
        Completiontime: uniqueUsers[i].Completiontime || null,
      };
    }

    // ✅ Sort uniqueUsers by rank (lowest first)
    uniqueUsers.sort((a, b) => (a._doc.rank || 9999) - (b._doc.rank || 9999));

    // ✅ Final response
    return res.status(200).json({
      message: "Top users fetched successfully.",
      users: uniqueUsers,
    });
  } catch (error) {
    console.error("Error in topusers:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

exports.topusers = async (req, res) => {
  try {
    const examId = req.params.id;

    if (!examId) {
      return res.status(400).json({ message: "examId required." });
    }

    // 1️⃣ Get exam for passout limit
    const exam = await Schoolerexam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found." });
    }

    // ✅ Passout limit (how many toppers per group)
    const passoutLimit = parseInt(exam.passout) || 1;

    // 2️⃣ Get all groups with members for this exam
    const groups = await ExamGroup.find({ examId }).populate(
      "members",
      "firstName lastName email"
    );

    if (!groups || groups.length === 0) {
      return res.status(200).json({
        message: "No groups found for this exam.",
        users: [],
      });
    }

    let allUsers = [];

    // 3️⃣ Collect top users from each group
    for (const group of groups) {
      const memberIds = group.members.map((m) => m._id);

      const scores = await ExamResult.find({
        examId,
        userId: { $in: memberIds },
      })
        .populate("userId", "firstName lastName email")
        .sort({ finalScore: -1 });

      // ✅ Pick top N users as per passout limit
      const topUsers = scores.slice(0, passoutLimit);
      allUsers.push(...topUsers);
    }

    // 4️⃣ Remove duplicate users (in case user exists in multiple groups)
    const uniqueUsers = [];
    const seen = new Set();

    for (const user of allUsers) {
      const userId = user.userId?._id?.toString();
      if (userId && !seen.has(userId)) {
        seen.add(userId);
        uniqueUsers.push(user);
      }
    }

    // 5️⃣ Calculate rank based on percentage across all users
    const allResults = await ExamResult.find({ examId })
      .select("userId percentage createdAt")
      .sort({ percentage: -1, createdAt: 1 })
      .lean();

    const ranks = new Map();
    allResults.forEach((result, index) => {
      ranks.set(result.userId.toString(), index + 1);
    });

    // 6️⃣ Attach rank and completion time to users
    for (let i = 0; i < uniqueUsers.length; i++) {
      const userId = uniqueUsers[i].userId?._id?.toString();
      const rank = ranks.get(userId) || null;

      uniqueUsers[i]._doc = {
        ...uniqueUsers[i]._doc,
        rank,
        Completiontime: uniqueUsers[i].Completiontime || null,
      };
    }

    // 7️⃣ Sort final list by rank (lowest rank = higher position)
    uniqueUsers.sort((a, b) => (a._doc.rank || 9999) - (b._doc.rank || 9999));

    // ✅ 8️⃣ Final Response
    return res.status(200).json({
      message: `Top ${passoutLimit} users fetched successfully for Exam "${exam.name || exam._id}".`,
      examId: exam._id,
      passoutLimit,
      users: uniqueUsers.map((u) => ({
        userId: u.userId?._id,
        firstName: u.userId?.firstName,
        lastName: u.userId?.lastName,
        email: u.userId?.email,
        finalScore: u.finalScore,
        percentage: u.percentage,
        rank: u._doc.rank,
        Completiontime: u._doc.Completiontime,
      })),
    });
  } catch (error) {
    console.error("🔥 Error in topusers:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};



exports.Leaderboard = async (req, res) => {
  try {
    const examId = req.params.id;
    const loggedInUserId = req.user?._id;

    if (!examId) return res.status(400).json({ message: "examId required." });

    // 1️⃣ Check exam
    const exam = await Schoolerexam.findById(examId);
    if (!exam) return res.status(404).json({ message: "Exam not found." });

    // 2️⃣ Get all exam results for this exam (all users who attempted)
    const allResults = await ExamResult.find({ examId })
      .populate("userId", "firstName lastName email")
      .sort({ percentage: -1, createdAt: 1 }); // higher percentage first, earlier attempts first

    if (!allResults || allResults.length === 0) {
      return res.status(200).json({
        message: "No users have attempted this exam yet.",
        users: [],
      });
    }

    // 3️⃣ Assign ranks
    const rankedResults = allResults.map((result, index) => ({
      ...result._doc,
      rank: index + 1,
      Completiontime: result.Completiontime || null,
    }));

    // 4️⃣ Bring logged-in user to the top (without changing ranks)
    if (loggedInUserId) {
      const idx = rankedResults.findIndex(
        (r) =>
          r.userId &&
          (r.userId._id ? r.userId._id.toString() : r.userId.toString()) ===
            loggedInUserId.toString()
      );
      if (idx > -1) {
        const [tokenUser] = rankedResults.splice(idx, 1);
        rankedResults.unshift(tokenUser);
      }
    }

    // 5️⃣ Response
    return res.status(200).json({
      message: "All users fetched successfully.",
      users: rankedResults,
    });
  } catch (error) {
    console.error("Error in Leaderboard:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};


// exports.Leaderboard = async (req, res) => {
//   try {
//     const examId = req.params.id;
//     const loggedInUserId = req.user?._id; // ✅ token user id

//     if (!examId) return res.status(400).json({ message: "examId required." });

//     // 1️⃣ Get exam for passout limit
//     const exam = await Schoolerexam.findById(examId);
//     if (!exam) return res.status(404).json({ message: "Exam not found." });

//     const passoutLimit = parseInt(exam.passout) || 1;

//     // 2️⃣ Get all groups with members
//     const groups = await ExamGroup.find({ examId }).populate("members", "firstName lastName email");
//     if (!groups || groups.length === 0)
//       return res.status(404).json({ message: "No groups found for this exam." });

//     let allUsers = [];

//     // 3️⃣ Collect top users from each group
//     for (const group of groups) {
//       const memberIds = group.members.map(m => m._id);

//       const scores = await ExamResult.find({
//         examId,
//         userId: { $in: memberIds },
//       })
//         .populate("userId", "firstName lastName email")
//         .sort({ finalScore: -1 });

//       const topUsers = scores.slice(0, passoutLimit);
//       allUsers.push(...topUsers);
//     }

//     // ✅ Remove duplicate users if any
//     const uniqueUsers = [];
//     const seen = new Set();

//     for (const user of allUsers) {
//       const userId = user.userId?._id?.toString();
//       if (userId && !seen.has(userId)) {
//         seen.add(userId);
//         uniqueUsers.push(user);
//       }
//     }

//     // ✅ Rank calculation based on percentage
//     const allResults = await ExamResult.find({ examId })
//       .select("userId percentage createdAt")
//       .sort({ percentage: -1, createdAt: 1 })
//       .lean();

//     const ranks = new Map();
//     allResults.forEach((result, index) => {
//       ranks.set(result.userId.toString(), index + 1);
//     });

//     // attach rank
//     for (let i = 0; i < uniqueUsers.length; i++) {
//       const userId = uniqueUsers[i].userId?._id?.toString();
//       const rank = ranks.get(userId) || null;
//       uniqueUsers[i]._doc = { ...uniqueUsers[i]._doc, rank };
//     }

//     // ✅ Sort uniqueUsers by rank (lowest first)
//     uniqueUsers.sort((a, b) => (a._doc.rank || 9999) - (b._doc.rank || 9999));

//     // ✅ Bring token user to the top (without changing rank order)
//     if (loggedInUserId) {
//       const idx = uniqueUsers.findIndex(
//         (u) =>
//           u.userId &&
//           (u.userId._id ? u.userId._id.toString() : u.userId.toString()) === loggedInUserId.toString()
//       );
//       if (idx > -1) {
//         const [tokenUser] = uniqueUsers.splice(idx, 1);
//         uniqueUsers.unshift(tokenUser); // move token user to top
//       }
//     }

//     // ✅ Final response
//     return res.status(200).json({
//       message: "Top users fetched successfully.",
//       users: uniqueUsers,
//     });
//   } catch (error) {
//     console.error("Error in Leaderboard:", error);
//     res.status(500).json({ message: "Internal server error", error: error.message });
//   }
// };



exports.getAllExamGroups = async (req, res) => {
  try {
    const examGroups = await ExamGroup.find()
      .populate('examId', 'name') 
      .populate('members', 'firstName lastName email') 
      .sort({ createdAt: -1 });

    if (!examGroups || examGroups.length === 0) {
      return res.status(404).json({ message: 'No exam groups found.' });
    }

    res.status(200).json({ success: true, examGroups });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
};
