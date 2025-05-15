const Assigned = require('../models/assignlearning'); 
const School = require('../models/school');
const College = require('../models/college');


exports.createAssigned = async (req, res) => {
  try {
    const {classId, learning,learning2,learning3 } = req.body;
    const createdBy = req.user.id; 

    if (!classId || !learning) {
      return res.status(400).json({ message: 'class and assign fields are required.' });
    }
    const assigned = new Assigned({
     classId,
      learning,
      learning2,
      learning3,
      createdBy
    });
    const savedAssigned = await assigned.save();
    res.status(201).json({
      message: 'Learning assigned successfully',
      data: savedAssigned
    });
  } catch (error) {
    console.error('Create Learning Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.getAllAssigned = async (req, res) => {
  try {
    const assign = await Assigned.find()
      .populate('classId')
      .populate('assign')
    res.status(200).json({
      message: 'All Assigned fetched successfully',
      data: assign
    });
  } catch (error) {
    console.error('Get Assigned Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};
