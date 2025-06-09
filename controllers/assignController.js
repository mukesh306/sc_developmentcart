const Assigned = require('../models/assignlearning'); 
const School = require('../models/school');
const College = require('../models/college');
const User = require('../models/User');
const MarkingSetting = require('../models/markingSetting');

exports.createAssigned = async (req, res) => {
  try {
    const {classId, learning,learning2,learning3,learning4} = req.body;
    const createdBy = req.user.id; 

    if (!classId || !learning) {
      return res.status(400).json({ message: 'class and assign fields are required.' });
    }
    const assigned = new Assigned({
     classId,
      learning,
      learning2,
      learning3,
      learning4,
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

exports.getAssignedList = async (req, res) => {
  try {
    const assignedList = await Assigned.find()
      .populate('learning')
      .populate('learning2')
      .populate('learning3')
      .populate('learning4')
      .lean(); 
    for (let item of assignedList) {
      let classInfo = await School.findById(item.classId).lean();
      if (!classInfo) {
        classInfo = await College.findById(item.classId).lean();
      }
      item.classInfo = classInfo || null; 
    }
    res.status(200).json({ data: assignedList });
  } catch (error) {
    console.error('Get Assigned Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.getAssignedListUser = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).lean();
    if (!user || !user.className) {
      return res.status(400).json({ message: 'User className not found.' });
    }
    const assignedList = await Assigned.find({ classId: user.className })
      .populate('learning')
      .populate('learning2')
      .populate('learning3')
      .lean();

    for (let item of assignedList) {
      let classInfo = await School.findById(item.classId).lean();
      if (!classInfo) {
        classInfo = await College.findById(item.classId).lean();
      }
      item.classInfo = classInfo || null;
    }
    res.status(200).json({ data: assignedList });
  } catch (error) {
    console.error('Get Assigned Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

exports.deleteAssigned = async (req, res) => {
  try {
    const { id } = req.params;

    const assigned = await Assigned.findById(id);
    if (!assigned) {
      return res.status(404).json({ message: 'Assigned record not found' });
    }

    const classId = assigned.classId;

    const usersWithClass = await User.find({ className: classId });

    if (usersWithClass.length > 0) {
      const hasStatusYes = usersWithClass.some(user => user.status === 'yes');
      if (hasStatusYes) {
        return res.status(400).json({ message: 'Cannot delete. One or more users with this class have status "yes".' });
      }
    }
    await Assigned.findByIdAndDelete(id);

    res.status(200).json({ message: 'Assigned record deleted successfully.' });
  } catch (error) {
    console.error('Delete Assigned Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};


exports.updateAssigned = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const assigned = await Assigned.findById(id);
    if (!assigned) {
      return res.status(404).json({ message: 'Assigned record not found' });
    }

    const classId = assigned.classId;

    const usersWithClass = await User.find({ className: classId });

    if (usersWithClass.length > 0) {
      const hasStatusYes = usersWithClass.some(user => user.status === 'yes');
      if (hasStatusYes) {
        return res.status(400).json({
          message: 'Cannot update. One or more users with this class have status "yes".'
        });
      }
    }

    const updatedAssigned = await Assigned.findByIdAndUpdate(id, updateData, { new: true });

    res.status(200).json({
      message: 'Assigned record updated successfully.',
     data: updatedAssigned
    });
  } catch (error) {
    console.error('Update Assigned Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};


exports.assignBonusPoint = async (req, res) => {
  try {
    const userId = req.user._id; 
    const { bonuspoint } = req.body;

    if (bonuspoint == null) {
      return res.status(400).json({ message: 'bonuspoint is required in body.' });
    }

    const markingSetting = await MarkingSetting.findOne({}).sort({ createdAt: -1 });
    if (!markingSetting) {
      return res.status(404).json({ message: 'Marking setting not found.' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { bonuspoint },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Step 3: Response me dono data bhej do
    return res.status(200).json({
      message: 'Bonus point saved successfully.',
      bonuspoint,
      user,
      markingSetting // ye marking settings ka data
    });
  } catch (error) {
    console.error('Error in assignBonusPoint:', error);
    return res.status(500).json({ message: error.message });
  }
};