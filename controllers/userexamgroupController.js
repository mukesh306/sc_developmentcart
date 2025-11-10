
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const UserExamGroup = require("../models/userExamGroup");
const User = require('../models/User');
const College = require('../models/college');
const School = require('../models/school');


exports.createGroup = async (req, res) => {
  try {
    const { memberIds } = req.body; 

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ message: "Members array is required and cannot be empty." });
    }

   
    const newGroup = await UserExamGroup.create({
      members: memberIds
    });

    res.status(201).json({
      message: "Group created successfully",
      group: newGroup
    });

    
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};


exports.AlluserExamGroups = async (req, res) => {
  try {
    const groups = await UserExamGroup.find()
      .populate("members", "name email className") 
      .sort({ createdAt: -1 });

    res.status(200).json({
      totalGroups: groups.length,
      groups
    });

  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


exports.updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { memberIds } = req.body; // New array of user IDs

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      return res.status(400).json({ message: "Members array cannot be empty." });
    }

    const updatedGroup = await UserExamGroup.findByIdAndUpdate(
      groupId,
      { members: memberIds },
      { new: true }
    ).populate("members", "name email");

    if (!updatedGroup) {
      return res.status(404).json({ message: "Group not found" });
    }

    res.status(200).json({
      message: "Group updated successfully",
      group: updatedGroup,
    });

  } catch (error) {
    console.error("Update Group Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
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

