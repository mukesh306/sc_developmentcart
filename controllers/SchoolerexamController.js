
const mongoose = require('mongoose');
const Schoolerexam = require("../models/Schoolerexam");
const School = require("../models/school");      
const College = require("../models/college");
const ExamAnswer = require("../models/examAttempt");
const ExamGroup = require("../models/examGroup");
const User = require("../models/User");
const ExamResult = require("../models/examResult");
const Schoolercategory = require("../models/schoolershipcategory");
const UserExamGroup  = require("../models/userExamGroup");
const CategoryTopUser = require("../models/CategoryTopUser");
const ExamUserStatus = require("../models/ExamUserStatus");

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
      .sort({ createdAt: 1 });

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

//     // 1) User class
//     const user = await User.findById(userId).select("className");
//     if (!user || !user.className) {
//       return res.status(400).json({ message: "User class not found." });
//     }

//     // 2) UserExamGroup check
//     const groupQuery = {
//       className: user.className,
//       members: userId,
//     };
//     if (category && mongoose.Types.ObjectId.isValid(category)) {
//       groupQuery.category = category;
//     }

//     const userExamGroup = await UserExamGroup.findOne(groupQuery).lean();
//     if (!userExamGroup) {
//       return res.status(200).json([]);
//     }

//     // 3) Get exams
//     let exams = await Schoolerexam.find({
//       className: user.className,
//     })
//       .populate("category", "name finalist")
//       .populate("createdBy", "name email")
//       .sort({ createdAt: 1 });

//     if (!exams || exams.length === 0) {
//       return res.status(200).json([]);
//     }

//     const updatedExams = [];

//     // 4) Process each exam
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

//       // Rank logic
//       const examCategoryId = exam.category?._id;
//       let userGroup = await UserExamGroup.findOne({
//         members: userId,
//         category: examCategoryId,
//       }).lean();

//       if (!userGroup) {
//         userGroup = await UserExamGroup.findOne({ members: userId })
//           .sort({ createdAt: -1 })
//           .lean();
//       }

//       let allResults = [];
//       if (userGroup) {
//         allResults = await ExamResult.find({
//           examId: exam._id,
//           userId: { $in: userGroup.members },
//         })
//           .select("userId percentage Completiontime")
//           .sort({ percentage: -1, Completiontime: 1 })
//           .lean();
//       }

//       if (userResult && allResults.length > 0) {
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

//       // Pass / Fail
//       const passLimit = parseInt(exam.passout) || 1;
//       examObj.result =
//         examObj.rank !== null
//           ? examObj.rank <= passLimit
//             ? "passed"
//             : "failed"
//           : null;

//       examObj.status = examObj.percentage !== null;
//       examObj.publish = exam.publish;
//       examObj.attend = true;

//       updatedExams.push(examObj);
//     }

//     // 5) Filter by category
//     let filteredExams = updatedExams;
//     if (category) {
//       filteredExams = filteredExams.filter(
//         (e) => e.category && e.category._id?.toString() === category
//       );
//     }

//     // 6) Attend logic
//     let stopNext = false;
//     const now = new Date();

//     for (let i = 0; i < filteredExams.length; i++) {
//       const exam = filteredExams[i];

//       const scheduledDateTime = new Date(
//         `${exam.ScheduleDate} ${exam.ScheduleTime}`
//       );

//       if (scheduledDateTime > now) {
//         exam.attend = true;
//         continue;
//       }

//       if (stopNext) {
//         exam.attend = false;
//         exam.publish = false;
//         exam.rank = null;
//         exam.correct = null;
//         exam.finalScore = null;
//         exam.percentage = null;
//         exam.result = null;
//         exam.status = false;
//         continue;
//       }

//       if (scheduledDateTime < now && exam.result === null) {
//         exam.attend = true;
//         stopNext = true;
//         continue;
//       }

//       if (exam.result === "failed") {
//         exam.attend = true;
//         stopNext = true;
//       }
//     }

//     // 7) Visibility logic
//     let visibleExams = [];
//     for (let i = 0; i < filteredExams.length; i++) {
//       const currentExam = filteredExams[i];

//       if (i === 0) {
//         currentExam.visible = true;
//         visibleExams.push(currentExam);
//         continue;
//       }

//       const previousExam = filteredExams[i - 1];
//       const passoutLimit = parseInt(previousExam.passout) || 1;

//       const userGroup = await ExamGroup.findOne({
//         examId: previousExam._id,
//         members: userId,
//       }).lean();

//       if (!userGroup) {
//         currentExam.visible = false;
//         visibleExams.push(currentExam);
//         continue;
//       }

//       const topResults = await ExamResult.find({
//         examId: previousExam._id,
//         userId: { $in: userGroup.members },
//       })
//         .sort({ percentage: -1, createdAt: 1 })
//         .limit(passoutLimit)
//         .select("userId")
//         .lean();

//       const topUserIds = topResults.map((r) => r.userId.toString());
//       currentExam.visible = topUserIds.includes(userId.toString());

//       visibleExams.push(currentExam);
//     }

//     // 8) Eligibility logic
//     let failedFound = false;
//     for (let i = 0; i < visibleExams.length; i++) {
//       const exam = visibleExams[i];

//       if (failedFound) {
//         exam.isEligible = false;
//       } else {
//         exam.isEligible = true;
//       }

//       if (exam.result === "failed") {
//         failedFound = true;
//         exam.isEligible = false;
//       }
//     }

//     // ------------------------------------------------------------------
//     // 9) SAVE / UPDATE LOGIC (ONLY THIS PART ADDED)
//     // ------------------------------------------------------------------
//     for (const exam of visibleExams) {
//       const existing = await ExamUserStatus.findOne({
//         userId,
//         examId: exam._id,
//       });

//       const payload = {
//         category: exam.category,
//         className: exam.className,
//         totalQuestions: exam.totalQuestions,
//         correct: exam.correct,
//         finalScore: exam.finalScore,
//         percentage: exam.percentage,
//         rank: exam.rank,
//         totalParticipants: exam.totalParticipants,
//         result: exam.result,
//         status: exam.status,
//         publish: exam.publish,
//         attend: exam.attend,
//         visible: exam.visible,
//         isEligible: exam.isEligible,
//         ScheduleDate: exam.ScheduleDate,
//         ScheduleTime: exam.ScheduleTime,
//       };

//       if (existing) {
//         await ExamUserStatus.updateOne(
//           { userId, examId: exam._id },
//           { $set: payload }
//         );
//       } else {
//         await ExamUserStatus.create({
//           userId,
//           examId: exam._id,
//           ...payload,
//         });
//       }
//     }

//     // Final response
//     return res.status(200).json(visibleExams);

//   } catch (error) {
//     console.error("🔥 Error fetching exams:", error);
//     res.status(500).json({
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };



// Assumes mongoose is imported above this file
// const mongoose = require('mongoose');


exports.UsersExams = async (req, res) => {
  try {
    const userId = req.user._id;
    const { category } = req.query;

    function parseIST(dateStr, timeStr) {
      const [day, month, year] = dateStr.split("-").map(Number);
      const [hh, mm, ss] = timeStr.split(":").map(Number);
      let date = new Date(Date.UTC(year, month - 1, day, hh, mm, ss));
      return new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
    }

    const user = await User.findById(userId).select("className");
    if (!user || !user.className) {
      return res.status(400).json({ message: "User class not found." });
    }

    const groupQuery = {
      className: user.className,
      members: userId,
    };
    if (category && mongoose.Types.ObjectId.isValid(category)) {
      groupQuery.category = category;
    }

    const userExamGroup = await UserExamGroup.findOne(groupQuery).lean();
    if (!userExamGroup) {
      return res.status(200).json([]);
    }

    let exams = await Schoolerexam.find({
      className: user.className,
    })
      .populate("category", "name finalist")
      .populate("createdBy", "name email")
      .sort({ createdAt: 1 });

    if (!exams || exams.length === 0) {
      return res.status(200).json([]);
    }

    const updatedExams = [];

    for (const exam of exams) {
      let classData =
        (await School.findById(exam.className).select("_id name className")) ||
        (await College.findById(exam.className).select("_id name className"));

      const examObj = exam.toObject();
      examObj.className = classData
        ? { _id: classData._id, name: classData.className || classData.name }
        : null;

      examObj.totalQuestions = exam.topicQuestions
        ? exam.topicQuestions.length
        : 0;

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

      const examCategoryId = exam.category?._id;
      let userGroup = await UserExamGroup.findOne({
        members: userId,
        category: examCategoryId,
      }).lean();

      if (!userGroup) {
        userGroup = await UserExamGroup.findOne({ members: userId })
          .sort({ createdAt: -1 })
          .lean();
      }

      let allResults = [];
      if (userGroup) {
        allResults = await ExamResult.find({
          examId: exam._id,
          userId: { $in: userGroup.members },
        })
          .select("userId percentage Completiontime")
          .sort({ percentage: -1, Completiontime: 1 })
          .lean();
      }

      if (userResult && allResults.length > 0) {
        let rank = null;
        for (let i = 0; i < allResults.length; i++) {
          if (allResults[i].userId.toString() === userId.toString()) {
            rank = i + 1;
            break;
          }
        }

        examObj.rank = rank;
        examObj.totalParticipants = allResults.length;
      } else {
        examObj.rank = null;
        examObj.totalParticipants = 0;
      }

      const passLimit = parseInt(exam.passout) || 1;
      examObj.result =
        examObj.rank !== null
          ? examObj.rank <= passLimit
            ? "passed"
            : "failed"
          : null;

      examObj.status = examObj.percentage !== null;
      examObj.publish = exam.publish;
      examObj.attend = true;

      updatedExams.push(examObj);
    }

    let filteredExams = updatedExams;
    if (category) {
      filteredExams = filteredExams.filter(
        (e) => e.category && e.category._id?.toString() === category
      );
    }

    let stopNext = false;

    // OLD ATTENDANCE LOGIC
    for (let i = 0; i < filteredExams.length; i++) {
      const exam = filteredExams[i];

      if (stopNext) {
        exam.attend = false;
        exam.publish = false;
        exam.rank = null;
        exam.correct = null;
        exam.finalScore = null;
        exam.percentage = null;
        exam.result = null;
        exam.status = false;
        continue;
      }

      if (exam.result === null) {
        exam.attend = true;
        stopNext = true;
        continue;
      }

      if (exam.result === "failed") {
        exam.attend = true;
        stopNext = true;
      }
    }

    // VISIBILITY LOGIC
    let visibleExams = [];
    for (let i = 0; i < filteredExams.length; i++) {
      const currentExam = filteredExams[i];

      if (i === 0) {
        currentExam.visible = true;
        visibleExams.push(currentExam);
        continue;
      }

      const previousExam = filteredExams[i - 1];
      const passoutLimit = parseInt(previousExam.passout) || 1;

      const userGroup = await ExamGroup.findOne({
        examId: previousExam._id,
        members: userId,
      }).lean();

      if (!userGroup) {
        currentExam.visible = false;
        visibleExams.push(currentExam);
        continue;
      }

      const topResults = await ExamResult.find({
        examId: previousExam._id,
        userId: { $in: userGroup.members },
      })
        .sort({ percentage: -1, createdAt: 1 })
        .limit(passoutLimit)
        .select("userId")
        .lean();

      const topUserIds = topResults.map((r) => r.userId.toString());
      currentExam.visible = topUserIds.includes(userId.toString());

      visibleExams.push(currentExam);
    }

    // --------------------------------------//
    //  UPDATED ELIGIBILITY LOGIC (required) //
    // --------------------------------------//
    let failedFound = false;

    for (let i = 0; i < visibleExams.length; i++) {
      const exam = visibleExams[i];

      if (failedFound) {
        exam.isEligible = false;
        continue;
      }

      exam.isEligible = true;

      if (exam.result === "failed") {
        failedFound = true;
        exam.isEligible = false;
      }
    }

    // SAVE LOGS
    if (category && mongoose.Types.ObjectId.isValid(category)) {
      const oldStatuses = await ExamUserStatus.find({ userId }).select(
        "category"
      );

      const oldCategoryIds = oldStatuses
        .map((s) => s.category?._id?.toString())
        .filter(Boolean);

      const categoriesToDelete = oldCategoryIds.filter(
        (cat) => cat !== category.toString()
      );

      if (categoriesToDelete.length > 0) {
        await ExamUserStatus.deleteMany({
          userId,
          "category._id": { $in: categoriesToDelete },
        });
      }
    }

    for (const exam of visibleExams) {
      const existing = await ExamUserStatus.findOne({
        userId,
        examId: exam._id,
      });

      const payload = {
        category: exam.category,
        className: exam.className,
        totalQuestions: exam.totalQuestions,
        correct: exam.correct,
        finalScore: exam.finalScore,
        percentage: exam.percentage,
        rank: exam.rank,
        totalParticipants: exam.totalParticipants,
        result: exam.result,
        status: exam.status,
        publish: exam.publish,
        attend: exam.attend,
        visible: exam.visible,
        isEligible: exam.isEligible,
        ScheduleDate: exam.ScheduleDate,
        ScheduleTime: exam.ScheduleTime,
      };

      if (existing) {
        await ExamUserStatus.updateOne(
          { userId, examId: exam._id },
          { $set: payload }
        );
      } else {
        await ExamUserStatus.create({
          userId,
          examId: exam._id,
          ...payload,
        });
      }
    }

    return res.status(200).json(visibleExams);

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
//     if (!exam) {
//       return res.status(404).json({ message: "Exam not found." });
//     }

//     // ✅ Auto-detect skip
//     const isSkipped = !selectedAnswer || selectedAnswer === "";

//     // ✅ Save / update answer
//     await ExamAnswer.findOneAndUpdate(
//       { userId, examId, questionId, attemptId },
//       { 
//         selectedAnswer: isSkipped ? null : selectedAnswer,
//         skipped: isSkipped 
//       },
//       { upsert: true, new: true }
//     );

//     const groupSize = exam.seat;

//     // ✅ Find the last group (highest groupNumber)
//     let lastGroup = await ExamGroup.findOne({ examId }).sort({ groupNumber: -1 });

//     if (!lastGroup || lastGroup.members.length >= groupSize) {
//       // ✅ Create new group
//       lastGroup = await ExamGroup.create({
//         examId,
//         groupNumber: lastGroup ? lastGroup.groupNumber + 1 : 1,
//         members: [userId],
//       });
//     } else {
//       // ✅ Add user to existing group if not already
//       if (!lastGroup.members.includes(userId)) {
//         lastGroup.members.push(userId);
//         await lastGroup.save();
//       }
//     }

//     return res.status(200).json({
//       message: isSkipped ? "Question skipped successfully." : "Answer saved successfully.",
//       attemptId,
//       groupNumber: lastGroup.groupNumber,
//       membersInGroup: lastGroup.members.length,
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
      return res.status(400).json({
        message: "examId, questionId, and attemptId are required.",
      });
    }

    const exam = await Schoolerexam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found." });
    }

    // ✅ Auto-detect skip
    const isSkipped = !selectedAnswer || selectedAnswer === "";

    // ✅ Save / update answer (same as before)
    await ExamAnswer.findOneAndUpdate(
      { userId, examId, questionId, attemptId },
      {
        selectedAnswer: isSkipped ? null : selectedAnswer,
        skipped: isSkipped,
      },
      { upsert: true, new: true }
    );

    const groupSize = exam.seat;
    let finalGroup;

    // ✅ Step 1: Check if user is in any UserExamGroup
    const userGroup = await UserExamGroup.findOne({ members: userId });

    if (userGroup) {
      console.log(`✅ User ${userId} belongs to UserExamGroup ${userGroup._id}`);

      // ✅ Step 2: Check if ExamGroup already exists for this group
      finalGroup = await ExamGroup.findOne({
        examId,
        members: { $in: userGroup.members },
      });

      if (!finalGroup) {
        const lastGroup = await ExamGroup.findOne({ examId }).sort({
          groupNumber: -1,
        });
        finalGroup = await ExamGroup.create({
          examId,
          groupNumber: lastGroup ? lastGroup.groupNumber + 1 : 1,
          members: userGroup.members,
        });
        console.log(`🆕 Created new ExamGroup for UserExamGroup ${userGroup._id}`);
      } else {
        console.log(`♻️ Existing ExamGroup reused for UserExamGroup ${userGroup._id}`);
      }
    } else {
      // ✅ Step 3: Original seat-based logic (unchanged)
      let lastGroup = await ExamGroup.findOne({ examId }).sort({
        groupNumber: -1,
      });

      if (!lastGroup || lastGroup.members.length >= groupSize) {
        lastGroup = await ExamGroup.create({
          examId,
          groupNumber: lastGroup ? lastGroup.groupNumber + 1 : 1,
          members: [userId],
        });
        console.log(`🆕 Created new ExamGroup (seat-based) for user ${userId}`);
      } else {
        if (!lastGroup.members.includes(userId)) {
          lastGroup.members.push(userId);
          await lastGroup.save();
          console.log(`👥 Added user ${userId} to existing ExamGroup ${lastGroup._id}`);
        }
      }
      finalGroup = lastGroup;
    }

    // ✅ Step 4: Populate members (for response)
    const populatedGroup = await ExamGroup.findById(finalGroup._id)
      .populate("members", "name email _id")
      .lean();

    return res.status(200).json({
      message: isSkipped
        ? "Question skipped successfully."
        : "Answer saved successfully.",
      attemptId,
      groupNumber: populatedGroup.groupNumber,
      membersInGroup: populatedGroup.members.length,
      members: populatedGroup.members, // includes {_id, name, email}
    });
  } catch (error) {
    console.error("❌ Error in submitExamAnswer:", error);
    res
      .status(500)
      .json({ message: "Internal server error.", error: error.message });
  }
};




// exports.calculateExamResult = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const { examId, attemptId, Completiontime } = req.body;

//     const exam = await Schoolerexam.findById(examId);
//     if (!exam) return res.status(404).json({ message: "Exam not found." });

//     const answers = await ExamAnswer.find({ userId, examId, attemptId });
//     if (answers.length === 0)
//       return res.status(400).json({ message: "No answers found for this attempt." });

//     let correct = 0,
//       wrong = 0,
//       skippedCount = 0,
//       total = exam.topicQuestions.length;

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
//         Completiontime, // ✅ Added field to save completion time
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
//       Completiontime: examResult.Completiontime, // ✅ Include in response too
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

    const total = exam.topicQuestions.length;

    // ✅ If no answers found → Auto save Zero Result
    if (answers.length === 0) {
      const examResult = await ExamResult.findOneAndUpdate(
        { userId, examId, attemptId },
        {
          userId,
          examId,
          attemptId,
          totalQuestions: total,
          attempted: 0,
          skipped: total,
          correct: 0,
          wrong: 0,
          negativeMarks: 0,
          finalScore: 0,
          percentage: 0,
          result: "fail",
          Completiontime,
        },
        { upsert: true, new: true }
      );

      // ✅ Same Response Format
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
        Completiontime: examResult.Completiontime,
        createdAt: examResult.createdAt,
      };

      return res.status(200).json({
        message: "Result calculated and saved successfully.",
        examResult: formattedResponse,
      });
    }

    // ✅ Normal Calculation Block (Same as before)
    let correct = 0, wrong = 0, skippedCount = 0;

    for (const ans of answers) {
      const question = exam.topicQuestions.find(
        q => q._id.toString() === ans.questionId.toString()
      );

      if (!question) continue;

      if (ans.skipped === true || !ans.selectedAnswer) {
        skippedCount++;
        continue;
      }

      if (ans.selectedAnswer === question.answer) correct++;
      else wrong++;
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
        Completiontime,
      },
      { upsert: true, new: true }
    );

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
      Completiontime: examResult.Completiontime,
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




// exports.topusers = async (req, res) => {
//   try {
//     const examId = req.params.id;

//     if (!examId) {
//       return res.status(400).json({ message: "examId required." });
//     }

//     // 1️⃣ Get exam for passout limit
//     const exam = await Schoolerexam.findById(examId);
//     if (!exam) {
//       return res.status(404).json({ message: "Exam not found." });
//     }

//     const passoutLimit = parseInt(exam.passout) || 1;

//     // 2️⃣ Get all groups with members
//     const groups = await ExamGroup.find({ examId }).populate(
//       "members",
//       "firstName lastName email className"
//     );

//     if (!groups || groups.length === 0) {
//       return res.status(200).json({
//         message: "No groups found for this exam.",
//         users: [],
//       });
//     }

//     let allUsers = [];

//     // 3️⃣ Collect top users from each group
//     for (const group of groups) {
//       const memberIds = group.members.map((m) => m._id);

//       const scores = await ExamResult.find({
//         examId,
//         userId: { $in: memberIds },
//       })
//         .populate("userId", "firstName lastName email className")
//         .sort({ finalScore: -1 });

//       const topUsers = scores.slice(0, passoutLimit);
//       allUsers.push(...topUsers);
//     }

//     // 4️⃣ Remove duplicates
//     const uniqueUsers = [];
//     const seen = new Set();
//     for (const user of allUsers) {
//       const userId = user.userId?._id?.toString();
//       if (userId && !seen.has(userId)) {
//         seen.add(userId);
//         uniqueUsers.push(user);
//       }
//     }

//     // 5️⃣ Rank calculation
//     const allResults = await ExamResult.find({ examId })
//       .select("userId percentage createdAt")
//       .sort({ percentage: -1, createdAt: 1 })
//       .lean();

//     const ranks = new Map();
//     allResults.forEach((result, index) => {
//       ranks.set(result.userId.toString(), index + 1);
//     });

//     for (let i = 0; i < uniqueUsers.length; i++) {
//       const userId = uniqueUsers[i].userId?._id?.toString();
//       const rank = ranks.get(userId) || null;

//       uniqueUsers[i]._doc = {
//         ...uniqueUsers[i]._doc,
//         rank,
//         Completiontime: uniqueUsers[i].Completiontime || null,
//       };
//     }

//     uniqueUsers.sort((a, b) => (a._doc.rank || 9999) - (b._doc.rank || 9999));

//     // 6️⃣ Check if last exam of category
//     const lastExam = await Schoolerexam.findOne({ category: exam.category })
//       .sort({ createdAt: -1 })
//       .lean();

//     if (lastExam && lastExam._id.toString() === examId.toString()) {
//       console.log("✅ This is the last exam of the category. Saving top users...");

//       // Get next category
//       const allCategories = await Schoolercategory.find().sort({ createdAt: 1 }).lean();
//       const currentIndex = allCategories.findIndex(
//         (c) => c._id.toString() === exam.category.toString()
//       );

//       const nextCategory =
//         currentIndex !== -1 && currentIndex + 1 < allCategories.length
//           ? allCategories[currentIndex + 1]
//           : null;

//       const categoryToSave = nextCategory ? nextCategory._id : exam.category;

//       // ✅ Save top users in CategoryTopUser with className
//       for (const u of uniqueUsers) {
//         const classNameId = u.userId?.className || null; // ✅ extract user's className

//         await CategoryTopUser.findOneAndUpdate(
//           { userId: u.userId._id, examId, categoryId: categoryToSave },
//           {
//             userId: u.userId._id,
//             examId,
//             categoryId: categoryToSave,
//             className: classNameId, // ✅ added field
//             percentage: u.percentage,
//             rank: u._doc.rank,
//           },
//           { upsert: true, new: true }
//         );
//       }
//     }

//     // ✅ Response
//     return res.status(200).json({
//       message: `Top ${passoutLimit} users fetched successfully for Exam "${exam.name || exam._id}".`,
//       examId: exam._id,
//       categoryId: exam.category,
//       passoutLimit,
//       users: uniqueUsers.map((u) => ({
//         userId: u.userId?._id,
//         firstName: u.userId?.firstName,
//         lastName: u.userId?.lastName,
//         email: u.userId?.email,
//         className: u.userId?.className || null, // ✅ also include in response
//         finalScore: u.finalScore,
//         percentage: u.percentage,
//         rank: u._doc.rank,
//         Completiontime: u._doc.Completiontime,
//       })),
//     });
//   } catch (error) {
//     console.error("🔥 Error in topusers:", error);
//     return res.status(500).json({
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };

exports.topusers = async (req, res) => {
  try {
    const examId = req.params.id;

    if (!examId) {
      return res.status(400).json({ message: "examId required." });
    }

   
    const exam = await Schoolerexam.findById(examId);
    if (!exam) {
      return res.status(404).json({ message: "Exam not found." });
    }

    const passoutLimit = parseInt(exam.passout) || 1;

  
    const groups = await ExamGroup.find({ examId }).populate(
      "members",
      "firstName lastName email className"
    );

    if (!groups || groups.length === 0) {
      return res.status(200).json({
        message: "No groups found for this exam.",
        users: [],
      });
    }

    let allUsers = [];

  
    for (const group of groups) {
      const memberIds = group.members.map((m) => m._id);

      const scores = await ExamResult.find({
        examId,
        userId: { $in: memberIds },
      })
        .populate("userId", "firstName lastName email className")
        .sort({ finalScore: -1, Completiontime: 1 });

     
      const passedUsers = scores.slice(0, passoutLimit);
      allUsers.push(...passedUsers);
    }

  
    const uniqueUsers = [];
    const seen = new Set();
    for (const user of allUsers) {
      const userId = user.userId?._id?.toString();
      if (userId && !seen.has(userId)) {
        seen.add(userId);
        uniqueUsers.push(user);
      }
    }

    
    const allResults = await ExamResult.find({ examId })
      .select("userId percentage createdAt")
      .sort({ percentage: -1, createdAt: 1 })
      .lean();

    const ranks = new Map();
    allResults.forEach((result, index) => {
      ranks.set(result.userId.toString(), index + 1);
    });

    for (let i = 0; i < uniqueUsers.length; i++) {
      const userId = uniqueUsers[i].userId?._id?.toString();
      const rank = ranks.get(userId) || null;

      uniqueUsers[i]._doc = {
        ...uniqueUsers[i]._doc,
        rank,
        Completiontime: uniqueUsers[i].Completiontime || null,
      };
    }

   
    uniqueUsers.sort((a, b) => (a._doc.rank || 9999) - (b._doc.rank || 9999));

    
    const lastExam = await Schoolerexam.findOne({ category: exam.category })
      .sort({ createdAt: -1 })
      .lean();

    if (lastExam && lastExam._id.toString() === examId.toString()) {
      console.log("✅ This is the last exam of the category. Saving passed users...");

      const allCategories = await Schoolercategory.find().sort({ createdAt: 1 }).lean();
      const currentIndex = allCategories.findIndex(
        (c) => c._id.toString() === exam.category.toString()
      );

      const nextCategory =
        currentIndex !== -1 && currentIndex + 1 < allCategories.length
          ? allCategories[currentIndex + 1]
          : null;

      const categoryToSave = nextCategory ? nextCategory._id : exam.category;

    
      for (const u of uniqueUsers) {
        const classNameId = u.userId?.className || null;

        await CategoryTopUser.findOneAndUpdate(
          { userId: u.userId._id, examId, categoryId: categoryToSave },
          {
            userId: u.userId._id,
            examId,
            categoryId: categoryToSave,
            className: classNameId,
            percentage: u.percentage,
            rank: u._doc.rank,
          },
          { upsert: true, new: true }
        );
      }
    }

   
    return res.status(200).json({
      message: `Top ${passoutLimit} passed users fetched successfully for Exam "${exam.name || exam._id}".`,
      examId: exam._id,
      categoryId: exam.category,
      passoutLimit,
      users: uniqueUsers.map((u) => ({
        userId: u.userId?._id,
        firstName: u.userId?.firstName,
        lastName: u.userId?.lastName,
        email: u.userId?.email,
        className: u.userId?.className || null,
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



// exports.Leaderboard = async (req, res) => {
//   try {
//     const examId = req.params.id;
//     const loggedInUserId = req.user?._id;

//     if (!examId) {
//       return res.status(400).json({ message: "examId required." });
//     }

//     // 1️⃣ Find exam
//     const exam = await Schoolerexam.findById(examId);
//     if (!exam) {
//       return res.status(404).json({ message: "Exam not found." });
//     }

//     // 2️⃣ Find logged-in user's group for this exam
//     const userGroup = await ExamGroup.findOne({
//       examId,
//       members: loggedInUserId,
//     });

//     if (!userGroup) {
//       return res.status(200).json({
//         message: "You are not assigned to any group for this exam.",
//         users: [],
//       });
//     }

//     // 3️⃣ Fetch exam results only for users in the same group
//     const allResults = await ExamResult.find({
//       examId,
//       userId: { $in: userGroup.members },
//     })
//       .populate("userId", "firstName lastName email")
//       .sort({ percentage: -1, Completiontime: 1 });

//     if (!allResults || allResults.length === 0) {
//       return res.status(200).json({
//         message: "No users from your group have attempted this exam yet.",
//         users: [],
//       });
//     }

//     // 4️⃣ Assign ranks (based on score and time)
//     const rankedResults = allResults.map((result, index) => ({
//       ...result._doc,
//       rank: index + 1,
//       Completiontime: result.Completiontime || null,
//     }));

//     // 5️⃣ Bring logged-in user to the top (without changing ranks)
//     if (loggedInUserId) {
//       const idx = rankedResults.findIndex(
//         (r) =>
//           r.userId &&
//           (r.userId._id ? r.userId._id.toString() : r.userId.toString()) ===
//             loggedInUserId.toString()
//       );
//       if (idx > -1) {
//         const [loggedUser] = rankedResults.splice(idx, 1);
//         rankedResults.unshift(loggedUser);
//       }
//     }

//     // 6️⃣ Send response
//     return res.status(200).json({
//       message: "Group leaderboard fetched successfully.",
//       groupNumber: userGroup.groupNumber,
//       users: rankedResults,
//     });
//   } catch (error) {
//     console.error("Error in Leaderboard:", error);
//     res.status(500).json({
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };



exports.Leaderboard = async (req, res) => {
  try {
    const examId = req.params.id;
    const loggedInUserId = req.user?._id;

    if (!examId) {
      return res.status(400).json({ message: "examId required." });
    }

    
    const exam = await Schoolerexam.findById(examId).populate("category", "name");
    if (!exam) {
      return res.status(404).json({ message: "Exam not found." });
    }

    let userGroup = await UserExamGroup.findOne({
      members: loggedInUserId,
      category: exam.category?._id, 
    }).lean();

 
    if (!userGroup) {
      userGroup = await UserExamGroup.findOne({
        members: loggedInUserId,
      })
        .sort({ createdAt: -1 })
        .lean();
    }

    if (!userGroup) {
      return res.status(200).json({
        message: "You are not assigned to any group for this exam.",
        users: [],
      });
    }

  
    const allResults = await ExamResult.find({
      examId,
      userId: { $in: userGroup.members },
    })
      .populate("userId", "firstName lastName email")
      .sort({ percentage: -1, Completiontime: 1 });

    if (!allResults || allResults.length === 0) {
      return res.status(200).json({
        message: "No users from your group have attempted this exam yet.",
        users: [],
      });
    }

    const rankedResults = allResults.map((result, index) => ({
      ...result._doc,
      rank: index + 1,
      Completiontime: result.Completiontime || null,
    }));

  
    if (loggedInUserId) {
      const idx = rankedResults.findIndex(
        (r) =>
          r.userId &&
          (r.userId._id ? r.userId._id.toString() : r.userId.toString()) ===
            loggedInUserId.toString()
      );
      if (idx > -1) {
        const [loggedUser] = rankedResults.splice(idx, 1);
        rankedResults.unshift(loggedUser);
      }
    }

   
    return res.status(200).json({
      message: "Group leaderboard fetched successfully.",
      className: userGroup.className,
      category: userGroup.category,
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
//     const loggedInUserId = req.user?._id;
//     if (!examId) return res.status(400).json({ message: "examId required." });

//     // 1️⃣ Check exam
//     const exam = await Schoolerexam.findById(examId);
//     if (!exam) return res.status(404).json({ message: "Exam not found." });

//     // 2️⃣ Get all exam results for this exam (all users who attempted)
//     const allResults = await ExamResult.find({ examId })
//       .populate("userId", "firstName lastName email")
//       .sort({ percentage: -1, Completiontime: 1 });

//     if (!allResults || allResults.length === 0) {
//       return res.status(200).json({
//         message: "No users have attempted this exam yet.",
//         users: [],
//       });
//     }

//     // 3️⃣ Assign ranks
//     const rankedResults = allResults.map((result, index) => ({
//       ...result._doc,
//       rank: index + 1,
//       Completiontime: result.Completiontime || null,
//     }));

//     // 4️⃣ Bring logged-in user to the top (without changing ranks)
//     if (loggedInUserId) {
//       const idx = rankedResults.findIndex(
//         (r) =>
//           r.userId &&
//           (r.userId._id ? r.userId._id.toString() : r.userId.toString()) ===
//             loggedInUserId.toString()
//       );
//       if (idx > -1) {
//         const [tokenUser] = rankedResults.splice(idx, 1);
//         rankedResults.unshift(tokenUser);
//       }
//     }

//     // 5️⃣ Response
//     return res.status(200).json({
//       message: "All users fetched successfully.",
//       users: rankedResults,
//     });
//   } catch (error) {
//     console.error("Error in Leaderboard:", error);
//     res.status(500).json({
//       message: "Internal server error",
//       error: error.message,
//     });
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


exports.schoolerShipPrizes = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    
    const categories = await Schoolercategory.find();

    let result = [];
    let totalAmount = 0; 

    for (const category of categories) {
   
      const lastExam = await Schoolerexam.findOne({ category: category._id }).sort({ createdAt: -1 });

      let status = false; 
      let percentage = null;
      let finalScore = null;
      let examId = null;

      if (lastExam) {
        examId = lastExam._id;

        const passoutLimit = parseInt(lastExam.passout) || 1;

        const groups = await ExamGroup.find({ examId: lastExam._id }).populate("members", "_id");

        let allTopUsers = [];

        for (const group of groups) {
          const memberIds = group.members.map((m) => m._id);

          const scores = await ExamResult.find({
            examId: lastExam._id,
            userId: { $in: memberIds }
          })
            .select("userId percentage finalScore")
            .sort({ finalScore: -1 });

          const topUsers = scores.slice(0, passoutLimit);
          allTopUsers.push(...topUsers);
        }

       
        const unique = [...new Map(allTopUsers.map(u => [u.userId.toString(), u])).values()];

      
        const isWinner = unique.find(u => u.userId.toString() === userId.toString());

        if (isWinner) {
          status = true;
          percentage = isWinner.percentage;
          finalScore = isWinner.finalScore;
          totalAmount += Number(category.price) || 0; 
        }
      }

    
      result.push({
        categoryId: category._id,
        categoryName: category.name,
        prize: category.price,
        examId,
        status,           
        percentage,
        finalScore
      });
    }

    return res.status(200).json({
      message: "User category prize status fetched successfully.",
      userId,
      totalCategories: result.length,
      totalAmount, 
      categories: result,
    });

  } catch (error) {
    console.error("🔥 Error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


// exports.schoolerShipPrizes = async (req, res) => {
//   try {
//     const userId = req.user?._id;
//     const className = req.user?.className; 

//     if (!userId) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     const categories = await Schoolercategory.find();

//     let result = [];
//     let totalAmount = 0; 

//     for (const category of categories) {

     
//       const topUserEntry = await CategoryTopUser.findOne({
//         categoryId: category._id,
//         userId: userId,
//         className: className
//       }).sort({ rank: 1 }); // optional: get the highest rank if multiple

//       let status = false;
//       let percentage = null;
//       let finalScore = null;
//       let examId = null;

//       if (topUserEntry) {
//         status = true;
//         percentage = topUserEntry.percentage;
//         finalScore = topUserEntry.percentage; // if you have another field for score, use that
//         examId = topUserEntry.examId;
//         totalAmount += Number(category.price) || 0;
//       }

//       result.push({
//         categoryId: category._id,
//         categoryName: category.name,
//         prize: category.price,
//         examId,
//         status,
//         percentage,
//         finalScore
//       });
//     }

//     return res.status(200).json({
//       message: "User category prize status fetched successfully.",
//       userId,
//       totalCategories: result.length,
//       totalAmount,
//       categories: result,
//     });

//   } catch (error) {
//     console.error("🔥 Error:", error);
//     res.status(500).json({ message: "Server Error", error: error.message });
//   }
// };