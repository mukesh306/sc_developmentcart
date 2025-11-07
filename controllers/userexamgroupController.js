const UserExamGroup = require("../models/userExamGroup");

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