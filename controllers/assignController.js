const mongoose = require('mongoose');
const moment = require('moment');
const Assigned = require('../models/assignlearning'); 
const School = require('../models/school');
const College = require('../models/college');
const User = require('../models/User');
const LearningScore = require('../models/learningScore');
const TopicScore = require('../models/topicScore');

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
      .populate('learning4')
      .lean();

    for (let item of assignedList) {
      let classInfo = await School.findById(item.classId).lean();
      if (!classInfo) {
        classInfo = await College.findById(item.classId).lean();
      }
      item.classInfo = classInfo || null;
      const getScore = async (learningField) => {
        if (item[learningField]?._id) {
          const topicScore = await TopicScore.findOne({
            userId: userId,
            learningId: item[learningField]._id,
          }).sort({ createdAt: 1 }).lean();

          return topicScore?.score ?? null;
        }
        return null;
      };
      if (!item.learning || Object.keys(item.learning).length === 0) item.learning = null;
      if (!item.learning2 || Object.keys(item.learning2).length === 0) item.learning2 = null;
      if (!item.learning3 || Object.keys(item.learning3).length === 0) item.learning3 = null;
      if (!item.learning4 || Object.keys(item.learning4).length === 0) item.learning4 = null;

      item.learningAverage = await getScore('learning');
      item.learning2Average = await getScore('learning2');
      item.learning3Average = await getScore('learning3');
      item.learning4Average = await getScore('learning4');
    }

    res.status(200).json({ data: assignedList });
  } catch (error) {
    console.error('Get Assigned Error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};




// exports.getAssignedListUser = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const user = await User.findById(userId).lean();
//     if (!user || !user.className) {
//       return res.status(400).json({ message: 'User className not found.' });
//     }
//     const assignedList = await Assigned.find({ classId: user.className })
//       .populate('learning')
//       .populate('learning2')
//       .populate('learning3')
//       .lean();

//     for (let item of assignedList) {
//       let classInfo = await School.findById(item.classId).lean();
//       if (!classInfo) {
//         classInfo = await College.findById(item.classId).lean();
//       }
//       item.classInfo = classInfo || null;
//     }
//     res.status(200).json({ data: assignedList });
//   } catch (error) {
//     console.error('Get Assigned Error:', error);
//     res.status(500).json({ message: 'Internal server error', error: error.message });
//   }
// };

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



// exports.assignBonusPoint = async (req, res) => {
//   try { 
//     const userId = req.user._id;
//     const bonuspoint = Number(req.query.bonuspoint); 

//     const markingSetting = await MarkingSetting.findOne({}, { weeklyBonus: 1, monthlyBonus: 1, _id: 0 })
//       .sort({ createdAt: -1 })
//       .lean();
      
//     if (!markingSetting) {
//       return res.status(404).json({ message: 'Marking setting not found.' });
//     }

//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ message: 'User not found.' });
//     }

//     // --- Calculate current streak ---
//     const scores = await LearningScore.find({ userId, strickStatus: true }).lean();
//     const topicScores = await TopicScore.find({ userId, strickStatus: true }).lean();

//     const allDatesSet = new Set();
//     scores.forEach(score => {
//       allDatesSet.add(moment(score.scoreDate).format('YYYY-MM-DD'));
//     });
//     topicScores.forEach(score => {
//       allDatesSet.add(moment(score.updatedAt).format('YYYY-MM-DD'));
//     });

//     const sortedDates = Array.from(allDatesSet).sort();
//     let currentStreak = { count: 0, startDate: null, endDate: null };
//     let streakStart = null;
//     let tempStreak = [];

//     for (let i = 0; i < sortedDates.length; i++) {
//       const curr = moment(sortedDates[i]);
//       const prev = i > 0 ? moment(sortedDates[i - 1]) : null;

//       if (!prev || curr.diff(prev, 'days') === 1) {
//         if (!streakStart) streakStart = sortedDates[i];
//         tempStreak.push(sortedDates[i]);
//       } else {
//         tempStreak = [sortedDates[i]];
//         streakStart = sortedDates[i];
//       }
//     }

//     if (tempStreak.length > 0) {
//       currentStreak = {
//         count: tempStreak.length,
//         startDate: streakStart,
//         endDate: tempStreak[tempStreak.length - 1]
//       };
//     }

//     // --- Update bonus point ---
//     let updatedBonus = user.bonuspoint || 0;
//     if (!isNaN(bonuspoint)) {
//       updatedBonus += bonuspoint;
//       user.bonuspoint = updatedBonus;
//       await user.save();
//     }

//     // --- Response ---
//     return res.status(200).json({
//       message: !isNaN(bonuspoint) ? 'Bonus point added successfully.' : 'Streak fetched successfully.',
//       bonuspoint: updatedBonus,
//       weekly: {
//         count: currentStreak.count % 7 === 0 ? 7 : currentStreak.count % 7,
//         startDate: currentStreak.startDate,
//         endDate: currentStreak.endDate
//       },
//       monthly: {
//         count: currentStreak.count % 30 === 0 ? 30 : currentStreak.count % 30,
//         startDate: currentStreak.startDate,
//         endDate: currentStreak.endDate
//       },
//       weeklyBonus: markingSetting.weeklyBonus || 0,
//       monthlyBonus: markingSetting.monthlyBonus || 0
//     });

//   } catch (error) {
//     console.error('Error in assignBonusPoint:', error);
//     return res.status(500).json({ message: error.message });
//   }
// };

exports.assignBonusPoint = async (req, res) => {
  try {
    const userId = req.user._id;
    const bonuspoint = Number(req.query.bonuspoint);

    const markingSetting = await MarkingSetting.findOne({}, { weeklyBonus: 1, monthlyBonus: 1, _id: 0 })
      .sort({ createdAt: -1 })
      .lean();

    if (!markingSetting) {
      return res.status(404).json({ message: 'Marking setting not found.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // --- Calculate current streak ---
    const scores = await LearningScore.find({ userId, strickStatus: true }).lean();
    const topicScores = await TopicScore.find({ userId, strickStatus: true }).lean();

    const allDatesSet = new Set();
    scores.forEach(score => {
      allDatesSet.add(moment(score.scoreDate).format('YYYY-MM-DD'));
    });
    topicScores.forEach(score => {
      allDatesSet.add(moment(score.updatedAt).format('YYYY-MM-DD'));
    });

    const sortedDates = Array.from(allDatesSet).sort();
    let currentStreak = { count: 0, startDate: null, endDate: null };
    let streakStart = null;
    let tempStreak = [];

    for (let i = 0; i < sortedDates.length; i++) {
      const curr = moment(sortedDates[i]);
      const prev = i > 0 ? moment(sortedDates[i - 1]) : null;

      if (!prev || curr.diff(prev, 'days') === 1) {
        if (!streakStart) streakStart = sortedDates[i];
        tempStreak.push(sortedDates[i]);
      } else {
        tempStreak = [sortedDates[i]];
        streakStart = sortedDates[i];
      }
    }

    if (tempStreak.length > 0) {
      currentStreak = {
        count: tempStreak.length,
        startDate: streakStart,
        endDate: tempStreak[tempStreak.length - 1]
      };
    }

    // --- Update bonus point ---
    let updatedBonus = user.bonuspoint || 0;
    if (!isNaN(bonuspoint)) {
      updatedBonus += bonuspoint;
      user.bonuspoint = updatedBonus;
      await user.save();
    }

    // --- Prepare response with conditional endDate ---
    const weeklyCount = currentStreak.count % 7 === 0 ? 7 : currentStreak.count % 7;
    const monthlyCount = currentStreak.count % 30 === 0 ? 30 : currentStreak.count % 30;

    return res.status(200).json({
      message: !isNaN(bonuspoint) ? 'Bonus point added successfully.' : 'Streak fetched successfully.',
      bonuspoint: updatedBonus,
      weekly: {
        count: weeklyCount,
        startDate: currentStreak.startDate,
        endDate: weeklyCount === 7 ? currentStreak.endDate : null
      },
      monthly: {
        count: monthlyCount,
        startDate: currentStreak.startDate,
        endDate: monthlyCount === 30 ? currentStreak.endDate : null
      },
      weeklyBonus: markingSetting.weeklyBonus || 0,
      monthlyBonus: markingSetting.monthlyBonus || 0
    });

  } catch (error) {
    console.error('Error in assignBonusPoint:', error);
    return res.status(500).json({ message: error.message });
  }
};



// exports.assignBonusPoint = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const bonuspoint = Number(req.query.bonuspoint); 

//     const markingSetting = await MarkingSetting.findOne({}).sort({ createdAt: -1 });
//     if (!markingSetting) {
//       return res.status(404).json({ message: 'Marking setting not found.' });
//     }

//     let user = await User.findById(userId);

//     if (!user) {
//       return res.status(404).json({ message: 'User not found.' });
//     }

//     if (!isNaN(bonuspoint)) {
//       const previousBonus = user.bonuspoint || 0;
//       const updatedBonus = previousBonus + bonuspoint;

//       user.bonuspoint = updatedBonus;
//       await user.save();
//     }

//     return res.status(200).json({
//       message: !isNaN(bonuspoint)
//         ? 'Bonus point added successfully.'
//         : 'User fetched successfully.',
//       bonuspoint: user.bonuspoint,
//       user,
//       markingSetting
//     });
//   } catch (error) {
//     console.error('Error in assignBonusPoint:', error);
//     return res.status(500).json({ message: error.message });
//   }
// };

