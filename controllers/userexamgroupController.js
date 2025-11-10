
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const UserExamGroup = require("../models/userExamGroup");
const User = require('../models/User');
const College = require('../models/college');
const School = require('../models/school');
// const Schoolercategory = require("../models/schoolershipcategory");

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
    const { className } = req.query;

    // ✅ Build query
    let query = {};
    if (className && mongoose.Types.ObjectId.isValid(className)) {
      query.className = className;
    }

    // ✅ Fetch groups with category populated
    const groups = await UserExamGroup.find(query)
      .populate("category", "name _id")
      .sort({ createdAt: -1 });

    let finalGroups = [];

    for (let group of groups) {
      // ✅ Get className details (from School or College)
      let classId = group.className;
      let classDetails = null;

      if (mongoose.Types.ObjectId.isValid(classId)) {
        classDetails =
          (await School.findById(classId).select("name _id")) ||
          (await College.findById(classId).select("name _id"));
      }

      // ✅ Count members
      const totalMembers = group.members ? group.members.length : 0;

      // ✅ Construct clean response object
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
        totalMembers,
        members: [], // Always empty as per your request
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
    res.status(500).json({ message: "Internal Server Error", error: error.message });
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
      group: {
        _id: updatedGroup._id,
        category: updatedGroup.category ? updatedGroup.category.name : "N/A",
        className: updatedGroup.className ? updatedGroup.className.name : "N/A",
        totalMembers: updatedGroup.members.length,
        members: updatedGroup.members,
        createdAt: updatedGroup.createdAt,
      },
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

exports.getAllActiveUsers = async (req, res) => {
  try {
    const { className } = req.query;

    let query = { status: "yes" };

   
    if (className && mongoose.Types.ObjectId.isValid(className)) {
      query.className = className;
    }

    // ✅ Fetch users
    let users = await User.find(query)
      .populate('countryId', 'name')
      .populate('stateId', 'name')
      .populate('cityId', 'name')
      .populate({
        path: 'updatedBy',
        select: 'email session startDate endDate endTime name role'
      });

    const baseUrl = `${req.protocol}://${req.get('host')}`.replace('http://', 'https://');

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
        country: user.countryId?.name || '',
        state: user.stateId?.name || '',
        city: user.cityId?.name || '',
        institutionName: user.schoolName || user.collegeName || user.instituteName || '',
        institutionType: user.studentType || '',
        updatedBy: user.updatedBy || null
      };

      if (classDetails && classDetails.price != null) {
        formattedUser.classOrYear = classDetails.name;
      }

      finalList.push(formattedUser);
    }

    return res.status(200).json({
      message: 'Active users fetched successfully.',
      users: finalList
    });

  } catch (error) {
    console.error('Get Users Error:', error);
    return res.status(500).json({ message: error.message });
  }
};

