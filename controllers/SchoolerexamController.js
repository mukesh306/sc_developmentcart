
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
const MarkingSetting = require("../models/markingSetting");
const moment = require("moment-timezone");


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
      topicQuestions,
         examType,
    } = req.body;

    if (!examName || !category || !className || !ScheduleDate || !ScheduleTime || !ExamTime || !seat ||!examType ) {
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
      examType,
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
    const { category, className, examType } = req.query;

    // Removed examType populate 👇
    let exams = await Schoolerexam.find()
      .populate("category", "name")
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

    // ------------------------
    // APPLY FILTERS (ID BASED)
    // ------------------------
    let filteredExams = updatedExams;

    // category filter
    if (category) {
      filteredExams = filteredExams.filter(
        (e) => e.category && e.category._id?.toString() === category
      );
    }

    // class filter
    if (className) {
      filteredExams = filteredExams.filter(
        (e) => e.className && e.className._id?.toString() === className
      );
    }

    // ⭐ examType filter (ID match, NO POPULATE)
    if (examType) {
      filteredExams = filteredExams.filter(
        (e) => e.examType && e.examType.toString() === examType
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


// exports.assignGroupToExam = async (req, res) => {
//   try {
//     const { examId, examType, groupId } = req.body;

//     if (!examId || !examType || !groupId) {
//       return res.status(400).json({
//         message: "examId, examType and groupId are required.",
//       });
//     }
//     const exam = await Schoolerexam.findOne({
//       _id: examId,
//       examType: examType
//     });

//     if (!exam) {
//       return res.status(404).json({
//         message: "Exam not found or examType mismatch.",
//       });
//     }

//     if (exam.assignedGroup.includes(groupId)) {
//       return res.status(400).json({
//         message: "This group is already assigned to this exam.",
//       });
//     }

//     exam.assignedGroup.push(groupId);
//     await exam.save();

//     res.status(200).json({
//       message: "Group assigned successfully.",
//       exam,
//     });
//   } catch (error) {
//     console.error("Error assigning group:", error);
//     res.status(500).json({ message: "Internal server error", error });
//   }
// };

exports.assignGroupToExam = async (req, res) => {
  try {
    const { examId, examType, groupId } = req.body;

    if (!examId || !examType || !groupId) {
      return res.status(400).json({
        success: false,
        message: "examId, examType and groupId are required",
      });
    }

  
    const exam = await Schoolerexam.findById(examId);
    if (!exam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    
    if (!exam.assignedGroup.includes(groupId)) {
      exam.assignedGroup.push(groupId);
      await exam.save();
    }

    
    const group = await UserExamGroup.findById(groupId).populate(
      "members",
      "_id"
    );

    if (!group || !group.members || group.members.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No users found in group",
      });
    }

    
    for (const member of group.members) {
      const user = await User.findById(member._id);
      if (!user || !user.userDetails) continue;

      let userUpdated = false;

   
      for (const userCategory of user.userDetails) {
        if (!userCategory.examTypes) continue;

      
        const examTypeObj = userCategory.examTypes.find(
          (et) => et._id.toString() === examType.toString()
        );

        if (!examTypeObj) continue;

        
        if (
          !examTypeObj.exam ||
          !examTypeObj.exam._id ||
          examTypeObj.exam._id.toString() !== exam._id.toString()
        ) {
          examTypeObj.exam = { _id: exam._id };
          userUpdated = true;
        }
      }

     
      if (userUpdated) {
        await user.save();
      }
    }

    return res.status(200).json({
      success: true,
      message:
        "Exam assigned successfully and saved in userDetails.examTypes.exam",
      examId,
      examType,
      groupId,
    });
  } catch (error) {
    console.error("AssignGroupToExam Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};



exports.getExamByGroupAndExamType = async (req, res) => {
  try {
    const { examType, groupId } = req.query;

    if (!examType || !groupId) {
      return res.status(400).json({
        message: "examType and groupId are required.",
      });
    }

    const exam = await Schoolerexam.findOne({
      examType: examType,
      assignedGroup: groupId
    })
      .populate("category", "name")
      .populate("createdBy", "name email");

    if (!exam) {
      return res.status(200).json({
        message: "No exam found for given examType and groupId.",
      });
    }

   
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

    // ⭐ totalQuestions
    examObj.totalQuestions = exam.topicQuestions
      ? exam.topicQuestions.length
      : 0;

    res.status(200).json({
      message: "Exam found.",
      exam: examObj,
    });

  } catch (error) {
    console.error("Error fetching exam:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};

exports.deleteGroupFromExam = async (req, res) => {
  try {
    const { examId, examType, groupId } = req.query;

    if (!examId || !examType || !groupId) {
      return res.status(400).json({
        message: "examId, examType and groupId are required.",
      });
    }

    const exam = await Schoolerexam.findOne({ _id: examId, examType });

    if (!exam) {
      return res.status(404).json({
        message: "Exam not found or examType mismatch.",
      });
    }

    const index = exam.assignedGroup.indexOf(groupId);

    if (index === -1) {
      return res.status(400).json({
        message: "This group is not assigned to this exam.",
      });
    }

    exam.assignedGroup.splice(index, 1);
    await exam.save();

    res.status(200).json({
      message: "Group deleted successfully.",
      exam,
    });

  } catch (error) {
    console.error("Error deleting group:", error);
    res.status(500).json({ message: "Internal server error", error });
  }
};



exports.updateGroupInExam = async (req, res) => {
  try {
    const { examId, examType, groupId } = req.body;

    if (!examId || !examType || !groupId) {
      return res.status(400).json({
        message: "examId, examType and groupId are required.",
      });
    }

    // 1️⃣ Find the exam where this group is currently assigned
    const oldExam = await Schoolerexam.findOne({
      examType: examType,
      assignedGroup: { $in: [groupId] }   // FIXED
    });

    if (!oldExam) {
      return res.status(404).json({
        message: "Group not found in any exam with this examType.",
      });
    }

    // 2️⃣ Find the new exam to move this group
    const newExam = await Schoolerexam.findOne({
      _id: examId,
      examType: examType
    });

    if (!newExam) {
      return res.status(404).json({
        message: "New examId not found.",
      });
    }

    // 3️⃣ Remove group from OLD exam
    oldExam.assignedGroup = oldExam.assignedGroup.filter(
      (id) => id.toString() !== groupId.toString()
    );
    await oldExam.save();

    // 4️⃣ Add group to NEW exam
    if (!newExam.assignedGroup.includes(groupId)) {
      newExam.assignedGroup.push(groupId);
      await newExam.save();
    }

    res.status(200).json({
      message: "Group moved to new exam successfully.",
      oldExam,
      newExam
    });

  } catch (error) {
    console.error("Error updating group:", error);
    res.status(500).json({ message: "Internal server error", error });
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

//     const user = await User.findById(userId).select("className").lean();
//     if (!user || !user.className) {
//       return res.status(400).json({ message: "User class not found." });
//     }

//     const assignedGroup = await UserExamGroup.findOne({
//       members: userId,
//       ...(category && mongoose.Types.ObjectId.isValid(category)
//         ? { category }
//         : {}),
//     }).lean();

//     if (!assignedGroup) return res.status(200).json([]);

//     const exams = await Schoolerexam.find({
//       className: user.className,
//       category: assignedGroup.category,
//       assignedGroup: { $in: [assignedGroup._id] },
//     })
//       .populate("category", "name finalist")
//       .populate("createdBy", "name email")
//       .sort({ createdAt: 1 })
//       .lean();

//     if (!exams || exams.length === 0) return res.status(200).json([]);

//     const markingSetting = await MarkingSetting.findOne().lean();
//     const bufferTime = markingSetting?.bufferTime
//       ? parseInt(markingSetting.bufferTime)
//       : 0;

//     const updatedExams = [];

//     const previousBlockedExam = await ExamUserStatus.findOne({
//       userId,
//       $or: [
//         { result: "failed" },
//         { attemptStatus: "Not Attempted", statusManage: "Completed" },
//       ],
//     })
//       .populate("examId", "createdAt")
//       .sort({ createdAt: 1 })
//       .lean();

//     for (const exam of exams) {
//       const examObj = { ...exam };

//       const existingStatus = await ExamUserStatus.findOne({
//         userId,
//         examId: exam._id,
//       }).lean();

//       const today = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");
//       const examDay = moment(exam.examDate)
//         .tz("Asia/Kolkata")
//         .format("YYYY-MM-DD");

//       if (
//         existingStatus?.statusManage &&
//         moment(examDay).isBefore(today)
//       ) {
//         examObj.statusManage = existingStatus.statusManage;
//         examObj.result = existingStatus.result ?? null;
//         examObj.rank = existingStatus.rank ?? null;
//         examObj.correct = existingStatus.correct ?? null;
//         examObj.finalScore = existingStatus.finalScore ?? null;
//         examObj.percentage = existingStatus.percentage ?? null;
//         examObj.totalParticipants =
//           existingStatus.totalParticipants ?? null;
//         examObj.attemptStatus = existingStatus.attemptStatus ?? null;

//         updatedExams.push(examObj);
//         continue;
//       }

//       const classData =
//         (await School.findById(exam.className)
//           .select("_id name className")
//           .lean()) ||
//         (await College.findById(exam.className)
//           .select("_id name className")
//           .lean());

//       examObj.className = classData
//         ? { _id: classData._id, name: classData.className || classData.name }
//         : null;

//       examObj.totalQuestions = exam.topicQuestions?.length || 0;

//       const allResults = await ExamResult.find({
//         examId: exam._id,
//         userId: { $in: assignedGroup.members },
//       })
//         .select("userId percentage Completiontime correct finalScore")
//         .sort({ percentage: -1, Completiontime: 1 })
//         .lean();

//       const isAfterBlockedExam =
//         previousBlockedExam &&
//         previousBlockedExam.examId?.createdAt &&
//         exam.createdAt > previousBlockedExam.examId.createdAt;

//       if (isAfterBlockedExam) {
//         examObj.statusManage = "Not Eligible";
//         examObj.result = null;
//         examObj.rank = null;
//         examObj.attemptStatus = null;

//         await ExamUserStatus.findOneAndUpdate(
//           { userId, examId: exam._id },
//           {
//             userId,
//             examId: exam._id,
//             category: exam.category,
//             statusManage: "Not Eligible",
//             result: null,
//             publish: exam.publish,
//             attemptStatus: null,
//           },
//           { upsert: true }
//         );

//         updatedExams.push(examObj);
//         continue;
//       }

//       const scheduleDateTime = moment(exam.examDate)
//         .tz("Asia/Kolkata")
//         .set({
//           hour: moment(exam.ScheduleTime, "HH:mm:ss").hour(),
//           minute: moment(exam.ScheduleTime, "HH:mm:ss").minute(),
//           second: moment(exam.ScheduleTime, "HH:mm:ss").second(),
//         });

//       const ongoingStart = scheduleDateTime
//         .clone()
//         .add(bufferTime, "minutes");
//       const ongoingEnd = ongoingStart
//         .clone()
//         .add(exam.ExamTime, "minutes");
//       const now = moment().tz("Asia/Kolkata");

//       let statusManage =
//         exam.publish === false ? "To Be Schedule" : "Scheduled";

//       if (exam.publish === true) {
//         if (now.isBefore(ongoingStart)) statusManage = "Scheduled";
//         else if (
//           now.isSameOrAfter(ongoingStart) &&
//           now.isBefore(ongoingEnd)
//         )
//           statusManage = "Ongoing";
//         else if (now.isSameOrAfter(ongoingEnd))
//           statusManage = "Completed";

//         examObj.updatedScheduleTime = ongoingStart.format("HH:mm:ss");
//       }

//       examObj.statusManage = statusManage;

//       /* ===================== Ongoing ===================== */
//       if (statusManage === "Ongoing") {
//         const ongoingResult = await ExamResult.findOne({
//           userId,
//           examId: exam._id,
//         }).select("_id").lean();

//         examObj.attemptStatus = ongoingResult
//           ? "Attempted"
//           : "Not Attempted";

//         // ✅ NEW: DB update for Ongoing
//         await ExamUserStatus.findOneAndUpdate(
//           { userId, examId: exam._id },
//           {
//             userId,
//             examId: exam._id,
//             category: exam.category,
//             publish: exam.publish,
//             statusManage: "Ongoing",
//             attemptStatus: examObj.attemptStatus,
//           },
//           { upsert: true }
//         );
//       }

//       /* ===================== Completed ===================== */
//       if (statusManage === "Completed") {
//         const userResult = await ExamResult.findOne({
//           userId,
//           examId: exam._id,
//         })
//           .select("correct finalScore percentage")
//           .lean();

//         examObj.correct = userResult?.correct ?? null;
//         examObj.finalScore = userResult?.finalScore ?? null;

//         if (userResult && examObj.totalQuestions > 0) {
//           examObj.percentage = parseFloat(
//             (
//               (userResult.finalScore / examObj.totalQuestions) *
//               100
//             ).toFixed(2)
//           );
//         } else {
//           examObj.percentage = null;
//         }

//         if (userResult && allResults.length > 0) {
//           const rank = allResults.findIndex(
//             (r) => r.userId.toString() === userId.toString()
//           );
//           examObj.rank = rank >= 0 ? rank + 1 : null;
//         } else {
//           examObj.rank = null;
//         }

//         examObj.totalParticipants = allResults.length;

//         examObj.attemptStatus =
//           examObj.correct !== null || examObj.finalScore !== null
//             ? "Attempted"
//             : "Not Attempted";

//         const passLimit = parseInt(exam.passout) || 1;

//         if (examObj.attemptStatus === "Not Attempted") {
//           examObj.result = null;
//         } else if (examObj.finalScore === null) {
//           examObj.result = "Not Attempt";
//         } else if (examObj.rank !== null) {
//           examObj.result =
//             examObj.rank <= passLimit ? "passed" : "failed";
//         }

//         await ExamUserStatus.findOneAndUpdate(
//           { userId, examId: exam._id },
//           {
//             userId,
//             examId: exam._id,
//             category: exam.category,
//             className: examObj.className,
//             totalQuestions: examObj.totalQuestions,
//             correct: examObj.correct,
//             finalScore: examObj.finalScore,
//             percentage: examObj.percentage,
//             rank: examObj.rank,
//             totalParticipants: examObj.totalParticipants,
//             result: examObj.result,
//             publish: exam.publish,
//             statusManage,
//             attemptStatus: examObj.attemptStatus,
//           },
//           { upsert: true }
//         );
//       }

//       updatedExams.push(examObj);
//     }

//     return res.status(200).json(updatedExams);
//   } catch (error) {
//     console.error("Error fetching exams:", error);
//     return res.status(500).json({
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };


exports.UsersExams = async (req, res) => {
  try {
    const userId = req.user._id;
    const { category } = req.query;

    const user = await User.findById(userId).select("className").lean();
    if (!user || !user.className) {
      return res.status(400).json({ message: "User class not found." });
    }

    const assignedGroup = await UserExamGroup.findOne({
      members: userId,
      ...(category && mongoose.Types.ObjectId.isValid(category)
        ? { category }
        : {}),
    }).lean();

    if (!assignedGroup) return res.status(200).json([]);

    const exams = await Schoolerexam.find({
      className: user.className,
      category: assignedGroup.category,
      assignedGroup: { $in: [assignedGroup._id] },
    })
      .populate("category", "name finalist")
      .populate("createdBy", "name email")
      .sort({ createdAt: 1 })
      .lean();

    if (!exams || exams.length === 0) return res.status(200).json([]);

    const markingSetting = await MarkingSetting.findOne().lean();
    const bufferTime = markingSetting?.bufferTime
      ? parseInt(markingSetting.bufferTime)
      : 0;

    const updatedExams = [];

    const previousBlockedExam = await ExamUserStatus.findOne({
      userId,
      $or: [
        { result: "failed" },
        { attemptStatus: "Not Attempted", statusManage: "Completed" },
      ],
    })
      .populate("examId", "createdAt")
      .sort({ createdAt: 1 })
      .lean();

    for (const exam of exams) {
      const examObj = { ...exam };

      const existingStatus = await ExamUserStatus.findOne({
        userId,
        examId: exam._id,
      }).lean();

      const today = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");
      const examDay = moment(exam.examDate)
        .tz("Asia/Kolkata")
        .format("YYYY-MM-DD");

     
      if (existingStatus && moment(examDay).isBefore(today)) {
        updatedExams.push({
          ...examObj,
          statusManage: existingStatus.statusManage ?? null,
          result: existingStatus.result ?? null,
          rank: existingStatus.rank ?? null,
          correct: existingStatus.correct ?? null,
          finalScore: existingStatus.finalScore ?? null,
          percentage: existingStatus.percentage ?? null,
          totalParticipants: existingStatus.totalParticipants ?? null,
          attemptStatus: existingStatus.attemptStatus ?? null,
        });
        continue;
      }
      

      const classData =
        (await School.findById(exam.className)
          .select("_id name className")
          .lean()) ||
        (await College.findById(exam.className)
          .select("_id name className")
          .lean());

      examObj.className = classData
        ? { _id: classData._id, name: classData.className || classData.name }
        : null;

      examObj.totalQuestions = exam.topicQuestions?.length || 0;

      const allResults = await ExamResult.find({
        examId: exam._id,
        userId: { $in: assignedGroup.members },
      })
        .select("userId percentage Completiontime correct finalScore")
        .sort({ percentage: -1, Completiontime: 1 })
        .lean();

      const isAfterBlockedExam =
        previousBlockedExam &&
        previousBlockedExam.examId?.createdAt &&
        exam.createdAt > previousBlockedExam.examId.createdAt;

      if (isAfterBlockedExam) {
        examObj.statusManage = "Not Eligible";
        examObj.result = null;
        examObj.rank = null;
        examObj.attemptStatus = null;

        await ExamUserStatus.findOneAndUpdate(
          { userId, examId: exam._id },
          {
            userId,
            examId: exam._id,
            category: exam.category,
            statusManage: "Not Eligible",
            result: null,
            publish: exam.publish,
            attemptStatus: null,
          },
          { upsert: true }
        );

        updatedExams.push(examObj);
        continue;
      }

      const scheduleDateTime = moment(exam.examDate)
        .tz("Asia/Kolkata")
        .set({
          hour: moment(exam.ScheduleTime, "HH:mm:ss").hour(),
          minute: moment(exam.ScheduleTime, "HH:mm:ss").minute(),
          second: moment(exam.ScheduleTime, "HH:mm:ss").second(),
        });

      const ongoingStart = scheduleDateTime.clone().add(bufferTime, "minutes");
      const ongoingEnd = ongoingStart.clone().add(exam.ExamTime, "minutes");
      const now = moment().tz("Asia/Kolkata");

      let statusManage =
        exam.publish === false ? "To Be Schedule" : "Scheduled";

      if (exam.publish === true) {
        if (now.isBefore(ongoingStart)) statusManage = "Scheduled";
        else if (now.isSameOrAfter(ongoingStart) && now.isBefore(ongoingEnd))
          statusManage = "Ongoing";
        else if (now.isSameOrAfter(ongoingEnd))
          statusManage = "Completed";

        examObj.updatedScheduleTime = ongoingStart.format("HH:mm:ss");
      }

      examObj.statusManage = statusManage;

      if (statusManage === "Ongoing") {
        const ongoingResult = await ExamResult.findOne({
          userId,
          examId: exam._id,
        }).select("_id").lean();

        examObj.attemptStatus = ongoingResult
          ? "Attempted"
          : "Not Attempted";

        await ExamUserStatus.findOneAndUpdate(
          { userId, examId: exam._id },
          {
            userId,
            examId: exam._id,
            category: exam.category,
            publish: exam.publish,
            statusManage: "Ongoing",
            attemptStatus: examObj.attemptStatus,
          },
          { upsert: true }
        );
      }

      if (statusManage === "Completed") {
        const userResult = await ExamResult.findOne({
          userId,
          examId: exam._id,
        })
          .select("correct finalScore percentage")
          .lean();

        examObj.correct = userResult?.correct ?? null;
        examObj.finalScore = userResult?.finalScore ?? null;

        if (userResult && examObj.totalQuestions > 0) {
          examObj.percentage = parseFloat(
            ((userResult.finalScore / examObj.totalQuestions) * 100).toFixed(2)
          );
        } else {
          examObj.percentage = null;
        }

        if (userResult && allResults.length > 0) {
          const rank = allResults.findIndex(
            (r) => r.userId.toString() === userId.toString()
          );
          examObj.rank = rank >= 0 ? rank + 1 : null;
        } else {
          examObj.rank = null;
        }

        examObj.totalParticipants = allResults.length;

        examObj.attemptStatus =
          examObj.correct !== null || examObj.finalScore !== null
            ? "Attempted"
            : "Not Attempted";

        const passLimit = parseInt(exam.passout) || 1;

        if (examObj.attemptStatus === "Not Attempted") {
          examObj.result = null;
        } else if (examObj.finalScore === null) {
          examObj.result = "Not Attempt";
        } else if (examObj.rank !== null) {
          examObj.result =
            examObj.rank <= passLimit ? "passed" : "failed";
        }

        await ExamUserStatus.findOneAndUpdate(
          { userId, examId: exam._id },
          {
            userId,
            examId: exam._id,
            category: exam.category,
            className: examObj.className,
            totalQuestions: examObj.totalQuestions,
            correct: examObj.correct,
            finalScore: examObj.finalScore,
            percentage: examObj.percentage,
            rank: examObj.rank,
            totalParticipants: examObj.totalParticipants,
            result: examObj.result,
            publish: exam.publish,
            statusManage,
            attemptStatus: examObj.attemptStatus,
          },
          { upsert: true }
        );
      }

      updatedExams.push(examObj);
    }

    
    const finalResponse = updatedExams.map((exam) => {
      if (exam.statusManage === "Not Eligible") {
        return {
          _id: exam._id,
          statusManage: exam.statusManage,
          result: exam.result ?? null,
          rank: exam.rank ?? null,
          attemptStatus: exam.attemptStatus ?? null,
        };
      }
      return exam;
    });

    return res.status(200).json(finalResponse);
  } catch (error) {
    console.error("Error fetching exams:", error);
    return res.status(500).json({
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

   
//     const exam = await Schoolerexam.findById(examId);
//     if (!exam) {
//       return res.status(404).json({ message: "Exam not found." });
//     }

//     const passoutLimit = parseInt(exam.passout) || 1;

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

  
//     for (const group of groups) {
//       const memberIds = group.members.map((m) => m._id);

//       const scores = await ExamResult.find({
//         examId,
//         userId: { $in: memberIds },
//       })
//         .populate("userId", "firstName lastName email className")
//         .sort({ finalScore: -1, Completiontime: 1 });

     
//       const passedUsers = scores.slice(0, passoutLimit);
//       allUsers.push(...passedUsers);
//     }

  
//     const uniqueUsers = [];
//     const seen = new Set();
//     for (const user of allUsers) {
//       const userId = user.userId?._id?.toString();
//       if (userId && !seen.has(userId)) {
//         seen.add(userId);
//         uniqueUsers.push(user);
//       }
//     } 
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

//     const lastExam = await Schoolerexam.findOne({ category: exam.category })
//       .sort({ createdAt: -1 })
//       .lean();

//     if (lastExam && lastExam._id.toString() === examId.toString()) {
//       console.log(" This is the last exam of the category. Saving passed users...");

//       const allCategories = await Schoolercategory.find().sort({ createdAt: 1 }).lean();
//       const currentIndex = allCategories.findIndex(
//         (c) => c._id.toString() === exam.category.toString()
//       );

//       const nextCategory =
//         currentIndex !== -1 && currentIndex + 1 < allCategories.length
//           ? allCategories[currentIndex + 1]
//           : null;

//       const categoryToSave = nextCategory ? nextCategory._id : exam.category;

    
//       for (const u of uniqueUsers) {
//         const classNameId = u.userId?.className || null;

//         await CategoryTopUser.findOneAndUpdate(
//           { userId: u.userId._id, examId, categoryId: categoryToSave },
//           {
//             userId: u.userId._id,
//             examId,
//             categoryId: categoryToSave,
//             className: classNameId,
//             percentage: u.percentage,
//             rank: u._doc.rank,
//           },
//           { upsert: true, new: true }
//         );
//       }
//     }

   
//     return res.status(200).json({
//       message: `Top ${passoutLimit} passed users fetched successfully for Exam "${exam.name || exam._id}".`,
//       examId: exam._id,
//       categoryId: exam.category,
//       passoutLimit,
//       users: uniqueUsers.map((u) => ({
//         userId: u.userId?._id,
//         firstName: u.userId?.firstName,
//         lastName: u.userId?.lastName,
//         email: u.userId?.email,
//         className: u.userId?.className || null,
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

    // ✅ STEP 1: group-wise toppers
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

    // ✅ STEP 2: remove duplicate users
    const uniqueUsers = [];
    const seen = new Set();

    for (const user of allUsers) {
      const uid = user.userId?._id?.toString();
      if (uid && !seen.has(uid)) {
        seen.add(uid);
        uniqueUsers.push(user);
      }
    }

    // ✅ STEP 3: calculate GLOBAL rank
    const allResults = await ExamResult.find({ examId })
      .select("userId percentage createdAt")
      .sort({ percentage: -1, createdAt: 1 })
      .lean();

    const ranks = new Map();
    allResults.forEach((r, index) => {
      ranks.set(r.userId.toString(), index + 1);
    });

    uniqueUsers.forEach((u) => {
      const uid = u.userId?._id?.toString();
      u._doc = {
        ...u._doc,
        rank: ranks.get(uid) || null,
        Completiontime: u.Completiontime || null,
      };
    });

    // ✅ STEP 4: GLOBAL SORT + LIMIT (🔥 MAIN FIX)
    uniqueUsers.sort(
      (a, b) => (a._doc.rank || 9999) - (b._doc.rank || 9999)
    );

    const usersToSave = uniqueUsers.slice(0, passoutLimit);

    // ✅ STEP 5: check LAST EXAM of CATEGORY
    const lastExam = await Schoolerexam.findOne({ category: exam.category })
      .sort({ createdAt: -1 })
      .lean();

    if (lastExam && lastExam._id.toString() === examId.toString()) {
      console.log("Last exam of category, saving top users");

      const allCategories = await Schoolercategory.find()
        .sort({ createdAt: 1 })
        .lean();

      const currentIndex = allCategories.findIndex(
        (c) => c._id.toString() === exam.category.toString()
      );

      const nextCategory =
        currentIndex !== -1 && currentIndex + 1 < allCategories.length
          ? allCategories[currentIndex + 1]
          : null;

      const categoryToSave = nextCategory
        ? nextCategory._id
        : exam.category;

      // ✅ STEP 6: SAVE ONLY GLOBAL TOP USERS
      for (const u of usersToSave) {
        const classNameId = u.userId?.className || null;

        await CategoryTopUser.findOneAndUpdate(
          {
            userId: u.userId._id,
            examId,
            categoryId: categoryToSave,
          },
          {
            userId: u.userId._id,
            examId,
            categoryId: categoryToSave,
            schoolerStatus: exam.category,
            className: classNameId,
            percentage: u.percentage,
            rank: u._doc.rank,
          },
          { upsert: true, new: true }
        );
      }
    }

    // ✅ RESPONSE
    return res.status(200).json({
      message: `Top ${passoutLimit} passed users fetched successfully.`,
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
    console.error("Error in topusers:", error);
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

    
//     const exam = await Schoolerexam.findById(examId).populate("category", "name");
//     if (!exam) {
//       return res.status(404).json({ message: "Exam not found." });
//     }

//     let userGroup = await UserExamGroup.findOne({
//       members: loggedInUserId,
//       category: exam.category?._id, 
//     }).lean();

 
//     if (!userGroup) {
//       userGroup = await UserExamGroup.findOne({
//         members: loggedInUserId,
//       })
//         .sort({ createdAt: -1 })
//         .lean();
//     }

//     if (!userGroup) {
//       return res.status(200).json({
//         message: "You are not assigned to any group for this exam.",
//         users: [],
//       });
//     }

  
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

//     const rankedResults = allResults.map((result, index) => ({
//       ...result._doc,
//       rank: index + 1,
//       Completiontime: result.Completiontime || null,
//     }));

  
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

   
//     return res.status(200).json({
//       message: "Group leaderboard fetched successfully.",
//       className: userGroup.className,
//       category: userGroup.category,
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
  
    const examStatus = await ExamUserStatus.findOne({
      examId,
      userId: loggedInUserId,
    }).lean();

    if (!examStatus || examStatus.rank === null || examStatus.result === null) {
      return res.status(200).json({
        message: "Leaderboard will be available after exam result is published.",
        users: [],
      });
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




// exports.schoolerShipPrizes = async (req, res) => {
//   try {
//     const userId = req.user?._id;
//     if (!userId) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     const categories = await Schoolercategory.find();

//     let result = [];
//     let totalAmount = 0;

//     for (const category of categories) {

     
//       const topUser = await CategoryTopUser.findOne({
//         userId,
//         schoolerStatus: category._id,
//       }).select("percentage rank examId className");

//       let examId = null;
//       let percentage = null;
//       let finalScore = null;
//       let status = null;

//       if (topUser) {
       
//         examId = topUser.examId;
//         percentage = topUser.percentage;
//         finalScore = topUser.rank;
//         status = false;

        
//         totalAmount += Number(category.price) || 0;

        
//        await ExamUserStatus.updateOne(
//   { userId, examId },
//   {
//     $set: {
//       prizeStatus: false,
//       percentage,
//       finalScore,
//       category: {
//         _id: category._id,
//         name: category.name,
//       },
//       className: topUser.className
//         ? {
//             _id: topUser.className._id,
//             name: topUser.className.name,
//           }
//         : null,
//     },
//   },
//   { upsert: true }
// );


//       } else {
       
//         const lastExam = await Schoolerexam
//           .findOne({ category: category._id })
//           .sort({ createdAt: -1 });

//         if (lastExam) {
//           examId = lastExam._id;

//           await ExamUserStatus.updateOne(
//             { userId, examId },
//             {
//               $set: {
//                 prizeStatus: null,
//                 percentage: null,
//                 finalScore: null,
//                 category: {
//                   _id: category._id,
//                   name: category.name,
//                 },
//               },
//             },
//             { upsert: true }
//           );
//         }
//       }

//       result.push({
//         categoryId: category._id,
//         categoryName: category.name,
//         prize: category.price,
//         examId,
//         status,
//         percentage,
//         finalScore,
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
//     console.error(error);
//     return res.status(500).json({
//       message: "Server Error",
//       error: error.message,
//     });
//   }
// };

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

      const topUser = await CategoryTopUser.findOne({
        userId,
        schoolerStatus: category._id,
      }).select("percentage rank examId className");

      let examId = null;
      let percentage = null;
      let finalScore = null;
      let status = null;

      if (topUser) {

        examId = topUser.examId;
        percentage = topUser.percentage;
        finalScore = topUser.rank;

        totalAmount += Number(category.price) || 0;

       
        const existingPrize = await ExamUserStatus.findOne(
          { userId, examId },
          { prizeStatus: 1 }
        );

        
        status = existingPrize?.prizeStatus === true ? true : false;

        
        if (!existingPrize || existingPrize.prizeStatus !== true) {
          await ExamUserStatus.updateOne(
            { userId, examId },
            {
              $set: {
                prizeStatus: false,
                percentage,
                finalScore,
                category: {
                  _id: category._id,
                  name: category.name,
                },
                className: topUser.className
                  ? {
                      _id: topUser.className._id,
                      name: topUser.className.name,
                    }
                  : null,
              },
            },
            { upsert: true }
          );
        }

      } else {

        const lastExam = await Schoolerexam
          .findOne({ category: category._id })
          .sort({ createdAt: -1 });

        if (lastExam) {
          examId = lastExam._id;

          await ExamUserStatus.updateOne(
            { userId, examId },
            {
              $set: {
                prizeStatus: null,
                percentage: null,
                finalScore: null,
                category: {
                  _id: category._id,
                  name: category.name,
                },
              },
            },
            { upsert: true }
          );
        }

        status = null;
      }

      result.push({
        categoryId: category._id,
        categoryName: category.name,
        prize: category.price,
        examId,
        status,          
        percentage,
        finalScore,
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
    console.error(error);
    return res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
};



exports.getPrizeStatusTrue = async (req, res) => {
  try {
    const { categoryId, classId } = req.query;

    const match = {
      prizeStatus: { $in: [true, false] }, 
      rank: { $ne: null },
      result: { $ne: null },
      finalScore: { $ne: null }
    };

    if (categoryId) {
      match["category._id"] = new mongoose.Types.ObjectId(categoryId);
    }

    if (classId) {
      match["className._id"] = new mongoose.Types.ObjectId(classId);
    }

    const data = await ExamUserStatus.aggregate([
      { $match: match },

      {
        $lookup: {
          from: "schoolercategories",
          localField: "category._id",
          foreignField: "_id",
          as: "categoryDetails"
        }
      },
      { $unwind: "$categoryDetails" },

      {
        $project: {
          _id: 0,
          examId: 1,
          prizeStatus: 1,
          className: 1,
          userId: 1,
          category: {
            _id: "$categoryDetails._id",
            name: "$categoryDetails.name",
            price: "$categoryDetails.price"
          }
        }
      }
    ]);

    await ExamUserStatus.populate(data, {
      path: "userId",
      select: "firstName middleName lastName mobileNumber email status"
    });

    res.status(200).json({
      success: true,
      count: data.length,
      data: data || []
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};





// exports.getPrizeStatusTrue = async (req, res) => {
//   try {
//     const { categoryId, classId } = req.query;

//     const match = {
//       prizeStatus: false,
//       rank: { $ne: null },
//       result: { $ne: null },
//       finalScore: { $ne: null }
//     };

//     if (categoryId) {
//       match["category._id"] = new mongoose.Types.ObjectId(categoryId);
//     }

//     if (classId) {
//       match["className._id"] = new mongoose.Types.ObjectId(classId);
//     }

//     const data = await ExamUserStatus.aggregate([
//       { $match: match },

//       {
//         $lookup: {
//           from: "schoolercategories",
//           localField: "category._id",
//           foreignField: "_id",
//           as: "categoryDetails"
//         }
//       },
//       { $unwind: "$categoryDetails" },

//       {
//         $project: {
//           _id: 0,
//           prizeStatus: 1,
//           className: 1,
//           userId: 1,
//           category: {
//             _id: "$categoryDetails._id",
//             name: "$categoryDetails.name",
//             price: "$categoryDetails.price"
//           }
//         }
//       }
//     ]);

//     await ExamUserStatus.populate(data, {
//       path: "userId",
//       select: "firstName middleName lastName mobileNumber email status"
//     });

    
//     res.status(200).json({
//       success: true,
//       count: data.length,
//       data: data || []
//     });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       success: false,
//       message: "Server error"
//     });
//   }
// };


exports.updatePrizeStatusTrue = async (req, res) => {
  try {
    const { userId, categoryId, examId } = req.body;

    if (!userId || !categoryId || !examId) {
      return res.status(400).json({
        success: false,
        message: "userId, categoryId and examId are required"
      });
    }

    const updatedData = await ExamUserStatus.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(userId),
        examId: new mongoose.Types.ObjectId(examId),
        "category._id": new mongoose.Types.ObjectId(categoryId),
        prizeStatus: false   
      },
      {
        $set: { prizeStatus: true }
      },
      { new: true }
    );

    if (!updatedData) {
      return res.status(200).json({
        success: true,
        message: "Prize status already true or null, update not required"
      });
    }

    res.status(200).json({
      success: true,
      message: "Prize status updated successfully"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};




// exports.updatePrizeStatusTrue = async (req, res) => {
//   try {
//     const { userId, categoryId } = req.body;

//     if (!userId || !categoryId) {
//       return res.status(400).json({
//         success: false,
//         message: "userId and categoryId are required"
//       });
//     }

//     const updatedData = await ExamUserStatus.findOneAndUpdate(
//       {
//         userId: new mongoose.Types.ObjectId(userId),
//         "category._id": new mongoose.Types.ObjectId(categoryId)
//       },
//       {
//         $set: { prizeStatus: true }
//       },
//       { new: true }
//     );

//     if (!updatedData) {
//       return res.status(404).json({
//         success: false,
//         message: "Record not found"
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Prize status updated successfully",
     
//     });

//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       success: false,
//       message: "Server error"
//     });
//   }
// };


exports.getExamsByAssignedGroup = async (req, res) => {
  try {
    const { groupId } = req.query;

    if (!groupId) {
      return res.status(400).json({
        message: "groupId is required",
      });
    }

    const markingSetting = await MarkingSetting.findOne({})
      .sort({ createdAt: -1 })
      .select("bufferTime")
      .lean();

    const bufferTime = markingSetting?.bufferTime
      ? parseInt(markingSetting.bufferTime)
      : 0;

    const exams = await Schoolerexam.find({
      assignedGroup: groupId,
    })
      .populate("category", "name examType")
      .select(
        "examName category examType ScheduleDate ScheduleTime ExamTime seat passout publish"
      )
      .lean();

    if (!exams.length) {
      return res.status(200).json({
        message: "No exams found for this group",
        total: 0,
        exams: [],
      });
    }

    const now = moment().tz("Asia/Kolkata");

    const formattedExams = exams.map((exam) => {
      let examTypeName = null;

      if (exam.category?.examType?.length && exam.examType) {
        const matchedType = exam.category.examType.find(
          (et) => et._id.toString() === exam.examType.toString()
        );
        examTypeName = matchedType?.name || null;
      }

      let ExamStatus = exam.publish ? "Scheduled" : "To Be Schedule";

      if (
        exam.publish &&
        exam.ScheduleDate &&
        exam.ScheduleTime &&
        exam.ExamTime
      ) {
        // ✅ FIXED DATE PARSING
        const scheduleDateTime = moment(
          exam.ScheduleDate,
          "DD-MM-YYYY"
        )
          .tz("Asia/Kolkata")
          .set({
            hour: moment(exam.ScheduleTime, "HH:mm:ss").hour(),
            minute: moment(exam.ScheduleTime, "HH:mm:ss").minute(),
            second: moment(exam.ScheduleTime, "HH:mm:ss").second(),
          });

        const ongoingStart = scheduleDateTime
          .clone()
          .add(bufferTime, "minutes");

        const ongoingEnd = ongoingStart
          .clone()
          .add(parseInt(exam.ExamTime), "minutes");

        if (now.isBefore(ongoingStart)) {
          ExamStatus = "Scheduled";
        } else if (
          now.isSameOrAfter(ongoingStart) &&
          now.isBefore(ongoingEnd)
        ) {
          ExamStatus = "Ongoing";
        } else if (now.isSameOrAfter(ongoingEnd)) {
          ExamStatus = "Completed";
        }
      }

      return {
        _id: exam._id,
        examName: exam.examName,

        category: {
          _id: exam.category._id,
          name: exam.category.name,
        },

        examTypeId: exam.examType,
        examTypeName,

        ScheduleDate: exam.ScheduleDate,
        ScheduleTime: exam.ScheduleTime,
        ExamTime: exam.ExamTime,

        passout: exam.passout,
        seat: exam.seat,
        publish: exam.publish,

        ExamStatus,
        bufferTime,
      };
    });

    return res.status(200).json({
      message: "Exams fetched successfully",
      total: formattedExams.length,
      exams: formattedExams,
    });
  } catch (error) {
    console.error("Error fetching exams by group:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};


// exports.getExamsByAssignedGroup = async (req, res) => {
//   try {
//     const { groupId } = req.query;

//     if (!groupId) {
//       return res.status(400).json({
//         message: "groupId is required",
//       });
//     }

   
//     const markingSetting = await MarkingSetting.findOne({})
//       .sort({ createdAt: -1 })
//       .select("bufferTime")
//       .lean();

//     const bufferTime = markingSetting?.bufferTime || 0;

//     const exams = await Schoolerexam.find({
//       assignedGroup: groupId,
//     })
//       .populate("category", "name examType")
//       .select(
//         "examName category examType ScheduleDate ScheduleTime ExamTime seat passout publish"
//       )
//       .lean();

//     if (!exams.length) {
//       return res.status(200).json({
//         message: "No exams found for this group",
//         total: 0,
//         exams: [], 
//       });
//     }

//     const formattedExams = exams.map((exam) => {
//       let examTypeName = null;

//       if (exam.category?.examType?.length && exam.examType) {
//         const matchedType = exam.category.examType.find(
//           (et) => et._id.toString() === exam.examType.toString()
//         );

//         examTypeName = matchedType?.name || null;
//       }

//       const ExamStatus = exam.publish ? "scheduled" : "to be scheduled";

//       return {
//         _id: exam._id,
//         examName: exam.examName,

//         category: {
//           _id: exam.category._id,
//           name: exam.category.name,
//         },

//         examTypeId: exam.examType,
//         examTypeName,

//         ScheduleDate: exam.ScheduleDate,
//         ScheduleTime: exam.ScheduleTime,
//         ExamTime: exam.ExamTime,

//         passout: exam.passout,
//         seat: exam.seat,
//         publish: exam.publish,
//         ExamStatus,

//         bufferTime, 
//       };
//     });

//     res.status(200).json({
//       message: "Exams fetched successfully",
//       total: formattedExams.length,
//       exams: formattedExams, 
//     });
//   } catch (error) {
//     console.error("Error fetching exams by group:", error);
//     res.status(500).json({
//       message: "Internal server error",
//       error,
//     });
//   }
// };



