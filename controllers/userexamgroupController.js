
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const UserExamGroup = require("../models/userExamGroup");
const User = require('../models/User');
const College = require('../models/college');
const School = require('../models/school');
const CategoryTopUser = require('../models/CategoryTopUser');
const Schoolerexam = require('../models/Schoolerexam');
const ExamResult = require("../models/examResult");
const ExamUserStatus = require("../models/ExamUserStatus");
const Category = require("../models/schoolershipcategory");

const Notification = require("../models/notification");
const Group = require("../models/userExamGroup");

// exports.createGroup = async (req, res) => {
//   try {
//     const { memberIds, category, className } = req.body;

//     if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
//       return res
//         .status(400)
//         .json({ message: "Members array is required and cannot be empty." });
//     }

//     if (!category || !mongoose.Types.ObjectId.isValid(category)) {
//       return res.status(400).json({ message: "Valid category ID is required." });
//     }

//     if (!className || !mongoose.Types.ObjectId.isValid(className)) {
//       return res.status(400).json({ message: "Valid className ID is required." });
//     }

//     const newGroup = await UserExamGroup.create({
//       members: memberIds,
//       category,
//       className,
//     });

//     res.status(201).json({
//       message: "Group created successfully",
//       group: newGroup,
//     });
//   } catch (error) {
//     console.error("Error creating group:", error);
//     res.status(500).json({ message: "Internal Server Error", error });
//   }
// };

exports.createGroup = async (req, res) => {
  try {
    const { memberIds, category, className } = req.body;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res
        .status(400)
        .json({ message: "Members array is required and cannot be empty." });
    }

    if (!category || !mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ message: "Valid category ID is required." });
    }

    if (!className || !mongoose.Types.ObjectId.isValid(className)) {
      return res.status(400).json({ message: "Valid className ID is required." });
    }

   
    const groupCount = await UserExamGroup.countDocuments({ category });

   
    const nextNumber = (groupCount + 1).toString().padStart(3, "0");
    const groupName = `Group_${nextNumber}`;

   
    const newGroup = await UserExamGroup.create({
      name: groupName,
      members: memberIds,
      category,
      className,
    });

    res.status(201).json({
      message: "Group created successfully",
      group: newGroup,
    });

  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};


// exports.AlluserExamGroups = async (req, res) => {
//   try {
//     const { className, category } = req.query; 

//     let query = {};
//     if (className && mongoose.Types.ObjectId.isValid(className)) {
//       query.className = className;
//     }
//     if (category && mongoose.Types.ObjectId.isValid(category)) {
//       query.category = category;
//     }

  
//     const groups = await UserExamGroup.find(query)
//       .populate("category", "name _id")
//       .sort({ createdAt: 1 });

//     let finalGroups = [];

//     for (let group of groups) {
//       let classId = group.className;
//       let classDetails = null;

//       if (mongoose.Types.ObjectId.isValid(classId)) {
//         classDetails =
//           (await School.findById(classId).select("name _id")) ||
//           (await College.findById(classId).select("name _id"));
//       }

     
//       finalGroups.push({
//         _id: group._id,
//         name: group.name,
//         category: {
//           _id: group.category ? group.category._id : null,
//           name: group.category ? group.category.name : "N/A",
//         },
//         className: {
//           _id: classDetails ? classDetails._id : null,
//           name: classDetails ? classDetails.name : "N/A",
//         },
//         totalMembers: group.members ? group.members.length : 0,
//         members: group.members || [], 
//         createdAt: group.createdAt,
//       });
//     }

//     return res.status(200).json({
//       message: "Groups fetched successfully",
//       totalGroups: finalGroups.length,
//       groups: finalGroups,
//     });
//   } catch (error) {
//     console.error("Error fetching groups:", error);
//     res
//       .status(500)
//       .json({ message: "Internal Server Error", error: error.message });
//   }
// };


exports.AlluserExamGroups = async (req, res) => {
  try {
    const { className, category } = req.query;

    let query = {};
    if (className && mongoose.Types.ObjectId.isValid(className)) {
      query.className = className;
    }
    if (category && mongoose.Types.ObjectId.isValid(category)) {
      query.category = category;
    }

    const groups = await UserExamGroup.find(query)
      .populate("category", "name _id examType")
      .sort({ createdAt: 1 });

    let finalGroups = [];

    for (let group of groups) {
      let classId = group.className;
      let classDetails = null;

      if (mongoose.Types.ObjectId.isValid(classId)) {
        classDetails =
          (await School.findById(classId).select("name _id")) ||
          (await College.findById(classId).select("name _id"));
      }

      // ⭐ Only examType length added
      const examCount = group.category?.examType?.length || 0;

      // ⭐ Count: this group is assigned in how many exams
      const examsWithThisGroup = await Schoolerexam.find({
        assignedGroup: group._id
      }).select("assignedGroup");

      const ExamAssignedCount = examsWithThisGroup.length;

    
      // let AssignedGroupCount = 0;
      // for (let ex of examsWithThisGroup) {
      //   AssignedGroupCount += (ex.assignedGroup?.length || 0);
      // }

      finalGroups.push({
        _id: group._id,
        name: group.name,

        category: {
          _id: group.category ? group.category._id : null,
          name: group.category ? group.category.name : "N/A",
        },

        ExamCount: examCount,               
        ExamAssignedCount,                  
        // AssignedGroupCount,                 

        className: {
          _id: classDetails ? classDetails._id : null,
          name: classDetails ? classDetails.name : "N/A",
        },

        totalMembers: group.members ? group.members.length : 0,
        members: group.members || [],
        createdAt: group.createdAt,
      });
    }

    return res.status(200).json({
      message: "Groups fetched successfully",
      totalGroups: finalGroups.length,
      groups: finalGroups,
    });
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};


exports.updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberIds, category, className } = req.body;

    // ✅ Validate groupId
    if (!groupId || !mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Valid groupId is required." });
    }

    // ✅ Find group first
    const existingGroup = await UserExamGroup.findById(groupId);
    if (!existingGroup) {
      return res.status(404).json({ message: "Group not found." });
    }

    // ✅ Prepare update object
    let updateData = {};

    // ✅ Validate members (optional but not empty if provided)
    if (memberIds) {
      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        return res
          .status(400)
          .json({ message: "Members array must be non-empty if provided." });
      }
      updateData.members = memberIds;
    }

    // ✅ Validate and set category
    if (category) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({ message: "Invalid category ID." });
      }
      updateData.category = category;
    }

    // ✅ Validate and set className
    if (className) {
      if (!mongoose.Types.ObjectId.isValid(className)) {
        return res.status(400).json({ message: "Invalid className ID." });
      }
      updateData.className = className;
    }

    // ✅ Perform update
    const updatedGroup = await UserExamGroup.findByIdAndUpdate(
      groupId,
      updateData,
      { new: true }
    )
      .populate("members", "name email")
      .populate("category", "name")
      .populate("className", "name");

    res.status(200).json({
      message: "Group updated successfully",
      // group: {
      //   _id: updatedGroup._id,
      //   category: updatedGroup.category ? updatedGroup.category.name : "N/A",
      //   className: updatedGroup.className ? updatedGroup.className.name : "N/A",
      //   totalMembers: updatedGroup.members.length,
      //   members: updatedGroup.members,
      //   createdAt: updatedGroup.createdAt,
      // },
    });
  } catch (error) {
    console.error("Update Group Error:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};


exports.deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;

    const deleted = await UserExamGroup.findByIdAndDelete(groupId);

    if (!deleted) {
      return res.status(404).json({ message: "Group not found" });
    }

    res.status(200).json({ message: "Group deleted successfully" });

  } catch (error) {
    console.error("Delete Group Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


// exports.getGroupMembers = async (req, res) => {
//   try {
//     const { groupId } = req.params;
//     const { examId } = req.query;

//     if (!groupId || !mongoose.Types.ObjectId.isValid(groupId)) {
//       return res.status(400).json({ message: "Valid groupId is required." });
//     }

//     if (!examId || !mongoose.Types.ObjectId.isValid(examId)) {
//       return res.status(400).json({ message: "Valid examId is required." });
//     }

//     const currentExam = await Schoolerexam.findOne({
//       _id: examId,
//       assignedGroup: groupId,
//     }).select("_id createdAt");

//     if (!currentExam) {
//       return res.status(200).json({
//         message: "No data found for this group and exam.",
//         groupId,
//         examId,
//         members: [],
//       });
//     }

   
//     const previousExams = await Schoolerexam.find({
//       assignedGroup: groupId,
//       createdAt: { $lt: currentExam.createdAt },
//     }).select("_id");

//     const previousExamIds = previousExams.map(e => e._id);
//     const eliminatedUserSet = new Set();

//     if (previousExamIds.length > 0) {
//       const eliminatedUsers = await ExamUserStatus.find({
//         examId: { $in: previousExamIds },
//         $or: [{ result: "failed" }, { attemptStatus: "Not Attempted" }],
//       })
//         .select("userId")
//         .lean();

//       eliminatedUsers.forEach(e =>
//         eliminatedUserSet.add(e.userId.toString())
//       );

//       const nullResultUsers = await ExamResult.find({
//         examId: { $in: previousExamIds },
//         percentage: null,
//         Completiontime: null,
//         rank: null,
//       })
//         .select("userId")
//         .lean();

//       nullResultUsers.forEach(u =>
//         eliminatedUserSet.add(u.userId.toString())
//       );
//     }

    
//     const group = await UserExamGroup.findById(groupId).populate(
//       "members",
//       "firstName middleName lastName status email category schoolershipstatus _id"
//     );

//     if (!group) {
//       return res.status(404).json({ message: "Group not found." });
//     }

//     const memberIds = group.members.map(m => m._id);

    
//     const examStatuses = await ExamUserStatus.find({
//       userId: { $in: memberIds },
//       examId,
//     })
//       .select("userId result rank attemptStatus")
//       .lean();

//     const examStatusMap = {};
//     examStatuses.forEach(es => {
//       examStatusMap[es.userId.toString()] = es;
//     });

   
//     const examResults = await ExamResult.find({
//       userId: { $in: memberIds },
//       examId,
//     })
//       .select("userId percentage Completiontime")
//       .lean();

//     const examResultMap = {};
//     examResults.forEach(er => {
//       examResultMap[er.userId.toString()] = er;
//     });

   
//     const membersWithExamData = [];

//     for (const member of group.members) {
      
//       if (eliminatedUserSet.has(member._id.toString())) continue;

//       const es = examStatusMap[member._id.toString()];
//       const er = examResultMap[member._id.toString()];

//       membersWithExamData.push({
//         _id: member._id,
//         firstName: member.firstName,
//         middleName: member.middleName,
//         lastName: member.lastName,
//         email: member.email,
//         status: member.status,
//         category: member.category,

      
//         schoolershipstatus: member.schoolershipstatus ?? "NA",

//         percentage: er?.percentage ?? null,
//         completionTime: er?.Completiontime ?? null,
//         rank: es?.rank ?? null,
//         attemptStatus: es?.attemptStatus ?? null,
//       });
//     }

//     return res.status(200).json({
//       message: "Group members fetched successfully.",
//       groupId,
//       examId,
//       members: membersWithExamData,
//     });
//   } catch (error) {
//     console.error("getGroupMembers Error:", error);
//     return res.status(500).json({
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };


exports.getGroupMembers = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { examId } = req.query;

    if (!groupId || !mongoose.Types.ObjectId.isValid(groupId)) {
      return res.status(400).json({ message: "Valid groupId is required." });
    }

    if (!examId || !mongoose.Types.ObjectId.isValid(examId)) {
      return res.status(400).json({ message: "Valid examId is required." });
    }

    const currentExam = await Schoolerexam.findOne({
      _id: examId,
      assignedGroup: groupId,
    }).select("_id createdAt");

    if (!currentExam) {
      return res.status(200).json({
        message: "No data found for this group and exam.",
        groupId,
        examId,
        members: [],
      });
    }

    const previousExams = await Schoolerexam.find({
      assignedGroup: groupId,
      createdAt: { $lt: currentExam.createdAt },
    }).select("_id");

    const previousExamIds = previousExams.map(e => e._id);
    const eliminatedUserSet = new Set();

    if (previousExamIds.length > 0) {
      const eliminatedUsers = await ExamUserStatus.find({
        examId: { $in: previousExamIds },
        $or: [{ result: "failed" }, { attemptStatus: "Not Attempted" }],
      })
        .select("userId")
        .lean();

      eliminatedUsers.forEach(e =>
        eliminatedUserSet.add(e.userId.toString())
      );

      const nullResultUsers = await ExamResult.find({
        examId: { $in: previousExamIds },
        percentage: null,
        Completiontime: null,
        rank: null,
      })
        .select("userId")
        .lean();

      nullResultUsers.forEach(u =>
        eliminatedUserSet.add(u.userId.toString())
      );
    }

    const group = await UserExamGroup.findById(groupId).populate(
      "members",
      "firstName middleName lastName status email category schoolershipstatus userDetails"
    );

    if (!group) {
      return res.status(404).json({ message: "Group not found." });
    }

    const memberIds = group.members.map(m => m._id);

    const examStatuses = await ExamUserStatus.find({
      userId: { $in: memberIds },
      examId,
    })
      .select("userId result rank attemptStatus")
      .lean();

    const examStatusMap = {};
    examStatuses.forEach(es => {
      examStatusMap[es.userId.toString()] = es;
    });

    const examResults = await ExamResult.find({
      userId: { $in: memberIds },
      examId,
    })
      .select("userId percentage Completiontime")
      .lean();

    const examResultMap = {};
    examResults.forEach(er => {
      examResultMap[er.userId.toString()] = er;
    });

    const membersWithExamData = [];

    for (const member of group.members) {
      if (eliminatedUserSet.has(member._id.toString())) continue;

      const es = examStatusMap[member._id.toString()];
      const er = examResultMap[member._id.toString()];
      let examStatusFromUser = null;

      if (Array.isArray(member.userDetails)) {
        for (const ud of member.userDetails) {
          if (Array.isArray(ud.examTypes)) {
            const matchedExam = ud.examTypes.find(
              et => et.exam && et.exam._id.toString() === examId
            );

            if (matchedExam) {
              examStatusFromUser = matchedExam.status; 
              break;
            }
          }
        }
      }

      membersWithExamData.push({
        _id: member._id,
        firstName: member.firstName,
        middleName: member.middleName,
        lastName: member.lastName,
        email: member.email,
        status: member.status,
        category: member.category,
        schoolershipstatus: member.schoolershipstatus ?? "NA",

        percentage: er?.percentage ?? null,
        completionTime: er?.Completiontime ?? null,
        rank: es?.rank ?? null,
        attemptStatus: es?.attemptStatus ?? null,

        examStatus: examStatusFromUser
      });
    }

    return res.status(200).json({
      message: "Group members fetched successfully.",
      groupId,
      examId,
      members: membersWithExamData,
    });
  } catch (error) {
    console.error("getGroupMembers Error:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};




// exports.getAllActiveUsers = async (req, res) => {
//   try {
//     const { className, groupId, stateId, cityId, category } = req.query;
//     const allowedCategoryId = "694234ab07da0be15f1f32f1";

   
//     if (category && category !== allowedCategoryId) {
     
//       let topUserFilter = { categoryId: category };
//       if (className && mongoose.Types.ObjectId.isValid(className)) {
//         topUserFilter.className = className;
//       }

//       const topUsers = await CategoryTopUser.find(topUserFilter)
//         .populate({
//           path: "userId",
//           populate: [
//             { path: "countryId", select: "name" },
//             { path: "stateId", select: "name" },
//             { path: "cityId", select: "name" },
//             {
//               path: "updatedBy",
//               select: "email session startDate endDate endTime name role",
//             },
//           ],
//         })
//         .populate("examId", "examName");

//       const baseUrl = `${req.protocol}://${req.get("host")}`.replace("http://", "https://");
//       let formattedUsers = [];

//       for (let record of topUsers) {
//         const user = record.userId;
//         if (!user) continue;

//         let classId = user.className;
//         let classDetails = null;

//         if (mongoose.Types.ObjectId.isValid(classId)) {
//           classDetails = (await School.findById(classId)) || (await College.findById(classId));
//         }

//         if (user.aadharCard && fs.existsSync(user.aadharCard)) {
//           user.aadharCard = `${baseUrl}/uploads/${path.basename(user.aadharCard)}`;
//         }
//         if (user.marksheet && fs.existsSync(user.marksheet)) {
//           user.marksheet = `${baseUrl}/uploads/${path.basename(user.marksheet)}`;
//         }

//         const formattedUser = {
//           ...user._doc,
//           percentage: record.percentage,
//           rank: record.rank,
//           exam: record.examId?.examName || "",
//           country: user.countryId?.name || "",
//           state: user.stateId?.name || "",
//           city: user.cityId?.name || "",
//           institutionName: user.schoolName || user.collegeName || user.instituteName || "",
//           institutionType: user.studentType || "",
//           updatedBy: user.updatedBy || null,
//         };

//         if (classDetails && classDetails.price != null) {
//           formattedUser.classOrYear = classDetails.name;
//         }

//         formattedUsers.push(formattedUser);
//       }

//       return res.status(200).json({
//         message: "Top users fetched successfully for this category.",
//         users: formattedUsers,
//       });
//     }

//     // ✅ Case 2: Normal logic (existing)
//     let query = { status: "yes" };

//     if (className && mongoose.Types.ObjectId.isValid(className)) {
//       query.className = className;
//     }

//     if (stateId && mongoose.Types.ObjectId.isValid(stateId)) {
//       query.stateId = stateId;
//     }

//     if (cityId && mongoose.Types.ObjectId.isValid(cityId)) {
//       query.cityId = cityId;
//     }

//     // Step 1: Collect all grouped users
//     const groupedUsers = await UserExamGroup.find({}, "members");
//     const allGroupedUserIds = groupedUsers.flatMap((g) => g.members.map((id) => id.toString()));

//     // Step 2: Current group members
//     let currentGroupMemberIds = [];
//     if (groupId && mongoose.Types.ObjectId.isValid(groupId)) {
//       const currentGroup = await UserExamGroup.findById(groupId).select("members");
//       if (currentGroup) {
//         currentGroupMemberIds = currentGroup.members.map((id) => id.toString());
//       }
//     }

//     // Step 3: Exclude grouped users except current group
//     const excludeIds = allGroupedUserIds.filter((id) => !currentGroupMemberIds.includes(id));
//     if (excludeIds.length > 0) {
//       query._id = { $nin: excludeIds };
//     }

//     // Step 4: Fetch users
//     let users = await User.find(query)
//       .populate("countryId", "name")
//       .populate("stateId", "name")
//       .populate("cityId", "name")
//       .populate({
//         path: "updatedBy",
//         select: "email session startDate endDate endTime name role",
//       });

//     const baseUrl = `${req.protocol}://${req.get("host")}`.replace("http://", "https://");
//     let finalList = [];

//     for (let user of users) {
//       let classId = user.className;
//       let classDetails = null;

//       if (mongoose.Types.ObjectId.isValid(classId)) {
//         classDetails = (await School.findById(classId)) || (await College.findById(classId));
//       }

//       if (user.aadharCard && fs.existsSync(user.aadharCard)) {
//         user.aadharCard = `${baseUrl}/uploads/${path.basename(user.aadharCard)}`;
//       }
//       if (user.marksheet && fs.existsSync(user.marksheet)) {
//         user.marksheet = `${baseUrl}/uploads/${path.basename(user.marksheet)}`;
//       }

//       const formattedUser = {
//         ...user._doc,
//         country: user.countryId?.name || "",
//         state: user.stateId?.name || "",
//         city: user.cityId?.name || "",
//         institutionName: user.schoolName || user.collegeName || user.instituteName || "",
//         institutionType: user.studentType || "",
//         updatedBy: user.updatedBy || null,
//       };

//       if (classDetails && classDetails.price != null) {
//         formattedUser.classOrYear = classDetails.name;
//       }

//       finalList.push(formattedUser);
//     }

//     return res.status(200).json({
//       message: "Active users fetched successfully (filtered by state, city, and excluding other groups).",
//       users: finalList,
//     });
//   } catch (error) {
//     console.error("Get Users Error:", error);
//     return res.status(500).json({ message: error.message });
//   }
// };

exports.getAllActiveUsers = async (req, res) => {
  try {
    const { className, groupId, stateId, cityId, category } = req.query;
    const firstCategory = await Category.findOne({}, { _id: 1 }).sort({ createdAt: 1 });
    const allowedCategoryId = firstCategory?._id?.toString();


    if (category && allowedCategoryId && category !== allowedCategoryId) {

      let topUserFilter = { categoryId: category };

      if (className && mongoose.Types.ObjectId.isValid(className)) {
        topUserFilter.className = className;
      }

      const topUsers = await CategoryTopUser.find(topUserFilter)
        .populate({
          path: "userId",
          populate: [
            { path: "countryId", select: "name" },
            { path: "stateId", select: "name" },
            { path: "cityId", select: "name" },
            {
              path: "updatedBy",
              select: "email session startDate endDate endTime name role",
            },
          ],
        })
        .populate("examId", "examName");

      const baseUrl = `${req.protocol}://${req.get("host")}`.replace("http://", "https://");
      let formattedUsers = [];

      for (let record of topUsers) {
        const user = record.userId;
        if (!user) continue;

        let classDetails = null;
        if (mongoose.Types.ObjectId.isValid(user.className)) {
          classDetails =
            (await School.findById(user.className)) ||
            (await College.findById(user.className));
        }

        if (user.aadharCard && fs.existsSync(user.aadharCard)) {
          user.aadharCard = `${baseUrl}/uploads/${path.basename(user.aadharCard)}`;
        }
        if (user.marksheet && fs.existsSync(user.marksheet)) {
          user.marksheet = `${baseUrl}/uploads/${path.basename(user.marksheet)}`;
        }

        const formattedUser = {
          ...user._doc,
          percentage: record.percentage,
          rank: record.rank,
          exam: record.examId?.examName || "",
          country: user.countryId?.name || "",
          state: user.stateId?.name || "",
          city: user.cityId?.name || "",
          institutionName:
            user.schoolName || user.collegeName || user.instituteName || "",
          institutionType: user.studentType || "",
          updatedBy: user.updatedBy || null,
        };

        if (classDetails && classDetails.price != null) {
          formattedUser.classOrYear = classDetails.name;
        }

        formattedUsers.push(formattedUser);
      }

      return res.status(200).json({
        message: "Top users fetched successfully for this category.",
        users: formattedUsers,
      });
    }

  
    let query = { status: "yes" };

    if (className && mongoose.Types.ObjectId.isValid(className)) {
      query.className = className;
    }

    if (stateId && mongoose.Types.ObjectId.isValid(stateId)) {
      query.stateId = stateId;
    }

    if (cityId && mongoose.Types.ObjectId.isValid(cityId)) {
      query.cityId = cityId;
    }

 
    const groupedUsers = await UserExamGroup.find({}, "members");
    const allGroupedUserIds = groupedUsers.flatMap(g =>
      g.members.map(id => id.toString())
    );

    
    let currentGroupMemberIds = [];
    if (groupId && mongoose.Types.ObjectId.isValid(groupId)) {
      const currentGroup = await UserExamGroup.findById(groupId).select("members");
      if (currentGroup) {
        currentGroupMemberIds = currentGroup.members.map(id => id.toString());
      }
    }

    
    const excludeIds = allGroupedUserIds.filter(
      id => !currentGroupMemberIds.includes(id)
    );

    if (excludeIds.length > 0) {
      query._id = { $nin: excludeIds };
    }

    
    const users = await User.find(query)
      .populate("countryId", "name")
      .populate("stateId", "name")
      .populate("cityId", "name")
      .populate({
        path: "updatedBy",
        select: "email session startDate endDate endTime name role",
      });

    const baseUrl = `${req.protocol}://${req.get("host")}`.replace("http://", "https://");
    let finalList = [];

    for (let user of users) {
      let classDetails = null;

      if (mongoose.Types.ObjectId.isValid(user.className)) {
        classDetails =
          (await School.findById(user.className)) ||
          (await College.findById(user.className));
      }

      if (user.aadharCard && fs.existsSync(user.aadharCard)) {
        user.aadharCard = `${baseUrl}/uploads/${path.basename(user.aadharCard)}`;
      }
      if (user.marksheet && fs.existsSync(user.marksheet)) {
        user.marksheet = `${baseUrl}/uploads/${path.basename(user.marksheet)}`;
      }

      const formattedUser = {
        ...user._doc,
        country: user.countryId?.name || "",
        state: user.stateId?.name || "",
        city: user.cityId?.name || "",
        institutionName:
          user.schoolName || user.collegeName || user.instituteName || "",
        institutionType: user.studentType || "",
        updatedBy: user.updatedBy || null,
      };

      if (classDetails && classDetails.price != null) {
        formattedUser.classOrYear = classDetails.name;
      }

      finalList.push(formattedUser);
    }

    return res.status(200).json({
      message:
        "Active users fetched successfully (filtered by state, city, and excluding other groups).",
      users: finalList,
    });

  } catch (error) {
    console.error("Get Users Error:", error);
    return res.status(500).json({ message: error.message });
  }
};


exports.getUserStates = async (req, res) => {
  try {
    const { className, groupId } = req.query;
    let query = { status: "yes" };

    if (className && mongoose.Types.ObjectId.isValid(className)) {
      query.className = className;
    }

    // ✅ Step 1: Get grouped users
    const groupedUsers = await UserExamGroup.find({}, "members");
    const allGroupedUserIds = groupedUsers.flatMap(g => g.members.map(id => id.toString()));

    // ✅ Step 2: Current group (if editing)
    let currentGroupMemberIds = [];
    if (groupId && mongoose.Types.ObjectId.isValid(groupId)) {
      const currentGroup = await UserExamGroup.findById(groupId).select("members");
      if (currentGroup) {
        currentGroupMemberIds = currentGroup.members.map(id => id.toString());
      }
    }

    // ✅ Step 3: Exclude already grouped users
    const excludeIds = allGroupedUserIds.filter(id => !currentGroupMemberIds.includes(id));
    if (excludeIds.length > 0) {
      query._id = { $nin: excludeIds };
    }

    // ✅ Step 4: Fetch all users (only state)
    const users = await User.find(query).select("stateId").populate("stateId", "name");

    // ✅ Step 5: Extract unique states
    const uniqueStatesMap = new Map();
    for (let u of users) {
      if (u.stateId && !uniqueStatesMap.has(u.stateId._id.toString())) {
        uniqueStatesMap.set(u.stateId._id.toString(), {
          _id: u.stateId._id,
          name: u.stateId.name
        });
      }
    }

    const uniqueStates = Array.from(uniqueStatesMap.values());

    return res.status(200).json({
      message: "Unique states fetched successfully.",
      states: uniqueStates
    });
  } catch (error) {
    console.error("Get User States Error:", error);
    return res.status(500).json({ message: error.message });
  }
};


exports.getUserCitiesByState = async (req, res) => {
  try {
    const { stateId, className, groupId } = req.query;
    if (!stateId || !mongoose.Types.ObjectId.isValid(stateId)) {
      return res.status(400).json({ message: "Valid stateId is required." });
    }

    let query = { status: "yes", stateId };

    if (className && mongoose.Types.ObjectId.isValid(className)) {
      query.className = className;
    }

    const groupedUsers = await UserExamGroup.find({}, "members");
    const allGroupedUserIds = groupedUsers.flatMap(g => g.members.map(id => id.toString()));

    
    let currentGroupMemberIds = [];
    if (groupId && mongoose.Types.ObjectId.isValid(groupId)) {
      const currentGroup = await UserExamGroup.findById(groupId).select("members");
      if (currentGroup) {
        currentGroupMemberIds = currentGroup.members.map(id => id.toString());
      }
    }

    
    const excludeIds = allGroupedUserIds.filter(id => !currentGroupMemberIds.includes(id));
    if (excludeIds.length > 0) {
      query._id = { $nin: excludeIds };
    }

   
    const users = await User.find(query).select("cityId").populate("cityId", "name");


    const uniqueCitiesMap = new Map();
    for (let u of users) {
      if (u.cityId && !uniqueCitiesMap.has(u.cityId._id.toString())) {
        uniqueCitiesMap.set(u.cityId._id.toString(), {
          _id: u.cityId._id,
          name: u.cityId.name
        });
      }
    }

    const uniqueCities = Array.from(uniqueCitiesMap.values());

    return res.status(200).json({
      message: "Cities fetched successfully for selected state.",
      cities: uniqueCities
    });
  } catch (error) {
    console.error("Get User Cities Error:", error);
    return res.status(500).json({ message: error.message });
  }
};



exports.publishExam = async (req, res) => {
  try {
    const { id } = req.params;

    const exam = await Schoolerexam.findById(id)
      .populate("category", "name");

    if (!exam) {
      return res.status(404).json({ message: "Exam not found." });
    }

    exam.publish = true;
    await exam.save();

    const group = await Group.findById(exam.groupId).select("users");

    if (!group || !group.users || group.users.length === 0) {
      return res.status(200).json({
        message: "Exam published, but no users found in group."
      });
    }

    const notifications = group.users.map((user) => ({
      userId: user._id ? user._id : user,
      examId: exam._id,
      type: "scheduled", // ✅ IMPORTANT
      title: "Exam Scheduled",
      message: `Your ${exam.category.name} exam has been scheduled for ${exam.ScheduleDate}`,
      scheduleDate: exam.ScheduleDate,
      scheduleTime: exam.ScheduleTime
    }));

    await Notification.insertMany(notifications);

    res.status(200).json({
      message: "Exam published & scheduled notifications sent."
    });
  } catch (error) {
    console.error("Notification Error:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error.message
    });
  }
};
