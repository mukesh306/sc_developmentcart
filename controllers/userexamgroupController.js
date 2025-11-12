
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const UserExamGroup = require("../models/userExamGroup");
const User = require('../models/User');
const College = require('../models/college');
const School = require('../models/school');
// const Schoolercategory = require("../models/schoolershipcategory");
const CategoryTopUser = require('../models/CategoryTopUser');

exports.createGroup = async (req, res) => {
  try {
    const { memberIds, category, className } = req.body;

    // ✅ Validate members
    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res
        .status(400)
        .json({ message: "Members array is required and cannot be empty." });
    }

    // ✅ Validate category
    if (!category || !mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({ message: "Valid category ID is required." });
    }

    // ✅ Validate className
    if (!className || !mongoose.Types.ObjectId.isValid(className)) {
      return res.status(400).json({ message: "Valid className ID is required." });
    }

    // ✅ Create the new group
    const newGroup = await UserExamGroup.create({
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
//     const { className } = req.query;

//     // ✅ Build query
//     let query = {};
//     if (className && mongoose.Types.ObjectId.isValid(className)) {
//       query.className = className;
//     }

//     // ✅ Fetch groups based on className filter
//     const groups = await UserExamGroup.find(query)
//       .populate("category", "name")
//       .sort({ createdAt: -1 });

//     let finalGroups = [];

//     for (let group of groups) {
//       // ✅ Get className details like before
//       let classId = group.className;
//       let classDetails = null;

//       if (mongoose.Types.ObjectId.isValid(classId)) {
//         classDetails = (await School.findById(classId)) || (await College.findById(classId));
//       }

//       // ✅ Only return total member count
//       const totalMembers = group.members ? group.members.length : 0;

//       finalGroups.push({
//         _id: group._id,
//         category: group.category ? group.category.name : "N/A",
//         className: classDetails ? classDetails.name : "N/A",
//         totalMembers,
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
//     res.status(500).json({ message: "Internal Server Error", error: error.message });
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

    // ✅ Fetch groups based on filters
    const groups = await UserExamGroup.find(query)
      .populate("category", "name _id")
      .sort({ createdAt: -1 });

    let finalGroups = [];

    for (let group of groups) {
      // ✅ Get className details from School or College
      let classId = group.className;
      let classDetails = null;

      if (mongoose.Types.ObjectId.isValid(classId)) {
        classDetails =
          (await School.findById(classId).select("name _id")) ||
          (await College.findById(classId).select("name _id"));
      }

      // ✅ Prepare clean response
      finalGroups.push({
        _id: group._id,
        category: {
          _id: group.category ? group.category._id : null,
          name: group.category ? group.category.name : "N/A",
        },
        className: {
          _id: classDetails ? classDetails._id : null,
          name: classDetails ? classDetails.name : "N/A",
        },
        totalMembers: group.members ? group.members.length : 0,
        members: group.members || [], // only user IDs
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
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
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


// exports.getAllActiveUsers = async (req, res) => {
//   try {
//     const { className, groupId, stateId, cityId, category } = req.query;

//     const allowedCategoryId = "6909f6ea193d765a50c836f9";

//     // ✅ Agar category di gayi hai aur wo allowed wali nahi hai
//     if (category && category !== allowedCategoryId) {
//       return res.status(200).json({
//         message: "No users found for this category.",
//         users: []
//       });
//     }

//     // ✅ Normal logic (agar category nahi di gayi ho ya allowed wali di gayi ho)
//     let query = { status: "yes" };

//     // ✅ Filter by className
//     if (className && mongoose.Types.ObjectId.isValid(className)) {
//       query.className = className;
//     }

//     // ✅ Filter by state
//     if (stateId && mongoose.Types.ObjectId.isValid(stateId)) {
//       query.stateId = stateId;
//     }

//     // ✅ Filter by city
//     if (cityId && mongoose.Types.ObjectId.isValid(cityId)) {
//       query.cityId = cityId;
//     }

//     // ✅ Step 1: Collect all userIds that are members of any group
//     const groupedUsers = await UserExamGroup.find({}, "members");
//     const allGroupedUserIds = groupedUsers.flatMap(g => g.members.map(id => id.toString()));

//     // ✅ Step 2: Get members of the current group (if editing)
//     let currentGroupMemberIds = [];
//     if (groupId && mongoose.Types.ObjectId.isValid(groupId)) {
//       const currentGroup = await UserExamGroup.findById(groupId).select("members");
//       if (currentGroup) {
//         currentGroupMemberIds = currentGroup.members.map(id => id.toString());
//       }
//     }

//     // ✅ Step 3: Exclude all grouped users except the ones in current group
//     const excludeIds = allGroupedUserIds.filter(id => !currentGroupMemberIds.includes(id));

//     if (excludeIds.length > 0) {
//       query._id = { $nin: excludeIds };
//     }

//     // ✅ Step 4: Fetch users
//     let users = await User.find(query)
//       .populate("countryId", "name")
//       .populate("stateId", "name")
//       .populate("cityId", "name")
//       .populate({
//         path: "updatedBy",
//         select: "email session startDate endDate endTime name role"
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
//         updatedBy: user.updatedBy || null
//       };

//       if (classDetails && classDetails.price != null) {
//         formattedUser.classOrYear = classDetails.name;
//       }

//       finalList.push(formattedUser);
//     }

//     return res.status(200).json({
//       message: "Active users fetched successfully (filtered by state, city, and excluding other groups).",
//       users: finalList
//     });

//   } catch (error) {
//     console.error("Get Users Error:", error);
//     return res.status(500).json({ message: error.message });
//   }
// };

exports.getAllActiveUsers = async (req, res) => {
  try {
    const { className, groupId, stateId, cityId, category } = req.query;
    const allowedCategoryId = "6909f6ea193d765a50c836f9";

    // ✅ CASE 1: If category is NOT allowed category (i.e. different category)
    if (category && category !== allowedCategoryId) {
      let topUsers = await CategoryTopUser.find({ categoryId: category })
        .populate({
          path: "userId",
          populate: [
            { path: "className", select: "name" }, // ✅ Added to allow className filter
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

      // ✅ Filter based on className, stateId, cityId
      topUsers = topUsers.filter((record) => {
        const user = record.userId;
        if (!user) return false;

        let match = true;

        // ✅ className filter
        if (className && mongoose.Types.ObjectId.isValid(className)) {
          match =
            match &&
            (user.className?._id?.toString() === className.toString() ||
              user.className?.toString() === className.toString());
        }

        // ✅ state filter
        if (stateId && mongoose.Types.ObjectId.isValid(stateId)) {
          match = match && user.stateId?._id?.toString() === stateId.toString();
        }

        // ✅ city filter
        if (cityId && mongoose.Types.ObjectId.isValid(cityId)) {
          match = match && user.cityId?._id?.toString() === cityId.toString();
        }

        return match;
      });

      // ✅ Group filtering (exclude users already in other groups)
      const groupedUsers = await UserExamGroup.find({}, "members");
      const allGroupedUserIds = groupedUsers.flatMap((g) =>
        g.members.map((id) => id.toString())
      );

      let currentGroupMemberIds = [];
      if (groupId && mongoose.Types.ObjectId.isValid(groupId)) {
        const currentGroup = await UserExamGroup.findById(groupId).select("members");
        if (currentGroup) {
          currentGroupMemberIds = currentGroup.members.map((id) => id.toString());
        }
      }

      const excludeIds = allGroupedUserIds.filter(
        (id) => !currentGroupMemberIds.includes(id)
      );

      // ✅ Remove already grouped users
      topUsers = topUsers.filter(
        (record) => !excludeIds.includes(record.userId?._id?.toString())
      );

      // ✅ Format response
      const baseUrl = `${req.protocol}://${req.get("host")}`.replace("http://", "https://");
      let formattedUsers = [];

      for (let record of topUsers) {
        const user = record.userId;
        if (!user) continue;

        let classId = user.className?._id || user.className;
        let classDetails = null;

        if (mongoose.Types.ObjectId.isValid(classId)) {
          classDetails = (await School.findById(classId)) || (await College.findById(classId));
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
          institutionName: user.schoolName || user.collegeName || user.instituteName || "",
          institutionType: user.studentType || "",
          updatedBy: user.updatedBy || null,
        };

        if (classDetails && classDetails.price != null) {
          formattedUser.classOrYear = classDetails.name;
        }

        formattedUsers.push(formattedUser);
      }

      return res.status(200).json({
        message: "Top users fetched successfully for this category (filtered).",
        users: formattedUsers,
      });
    }

    // ✅ CASE 2: Normal logic (allowed category)
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

    // Step 1: Collect all grouped users
    const groupedUsers = await UserExamGroup.find({}, "members");
    const allGroupedUserIds = groupedUsers.flatMap((g) => g.members.map((id) => id.toString()));

    // Step 2: Current group members
    let currentGroupMemberIds = [];
    if (groupId && mongoose.Types.ObjectId.isValid(groupId)) {
      const currentGroup = await UserExamGroup.findById(groupId).select("members");
      if (currentGroup) {
        currentGroupMemberIds = currentGroup.members.map((id) => id.toString());
      }
    }

    // Step 3: Exclude grouped users except current group
    const excludeIds = allGroupedUserIds.filter((id) => !currentGroupMemberIds.includes(id));
    if (excludeIds.length > 0) {
      query._id = { $nin: excludeIds };
    }

    // Step 4: Fetch users
    let users = await User.find(query)
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
      let classId = user.className;
      let classDetails = null;

      if (mongoose.Types.ObjectId.isValid(classId)) {
        classDetails = (await School.findById(classId)) || (await College.findById(classId));
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
        institutionName: user.schoolName || user.collegeName || user.instituteName || "",
        institutionType: user.studentType || "",
        updatedBy: user.updatedBy || null,
      };

      if (classDetails && classDetails.price != null) {
        formattedUser.classOrYear = classDetails.name;
      }

      finalList.push(formattedUser);
    }

    return res.status(200).json({
      message: "Active users fetched successfully (filtered by state, city, and excluding other groups).",
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

    // ✅ Step 3: Exclude grouped users
    const excludeIds = allGroupedUserIds.filter(id => !currentGroupMemberIds.includes(id));
    if (excludeIds.length > 0) {
      query._id = { $nin: excludeIds };
    }

    // ✅ Step 4: Fetch users (only city)
    const users = await User.find(query).select("cityId").populate("cityId", "name");

    // ✅ Step 5: Unique cities
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
