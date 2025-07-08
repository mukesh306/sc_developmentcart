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
    if (!user || !user.className || !user.session) {
      return res.status(400).json({ message: 'User className or session not found.' });
    }
    const assignedList = await Assigned.find({ classId: user.className })
      .populate('learning')
      .populate('learning2')
      .populate('learning3')
      .populate('learning4')
      .lean();

    // Process each assigned item
    for (let item of assignedList) {
      // Populate class info (School or College)
      let classInfo = await School.findById(item.classId).lean();
      if (!classInfo) {
        classInfo = await College.findById(item.classId).lean();
      }
      item.classInfo = classInfo || null;
 
      const getScore = async (learningField) => {
        const learning = item[learningField];
        if (learning && learning._id) {
          const scoreDoc = await TopicScore.findOne({
            userId,
            learningId: learning._id,
            session: user.session 
          }).lean();

          return scoreDoc?.score ?? 0;
        }
        return 0;
      };

      // Clean empty learning fields
      ['learning', 'learning2', 'learning3', 'learning4'].forEach(field => {
        if (!item[field] || Object.keys(item[field]).length === 0) {
          item[field] = null;
        }
      });

      // Attach score averages per learningId and session
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

//     // --- Prepare response with conditional endDate ---
//     const weeklyCount = currentStreak.count % 7 === 0 ? 7 : currentStreak.count % 7;
//     const monthlyCount = currentStreak.count % 30 === 0 ? 30 : currentStreak.count % 30;

//     return res.status(200).json({
//       message: !isNaN(bonuspoint) ? 'Bonus point added successfully.' : 'Streak fetched successfully.',
//       bonuspoint: updatedBonus,
//       weekly: {
//         count: weeklyCount,
//         startDate: currentStreak.startDate,
//         endDate: weeklyCount === 7 ? currentStreak.endDate : null
//       },
//       monthly: {
//         count: monthlyCount,
//         startDate: currentStreak.startDate,
//         endDate: monthlyCount === 30 ? currentStreak.endDate : null
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

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const sessionFilter = user.session ? { session: user.session } : {};

    // --- Fetch LearningScore & TopicScore with session match
    const scores = await LearningScore.find({
      userId,
      strickStatus: true,
      ...sessionFilter
    }).lean();

    const topicScores = await TopicScore.find({
      userId,
      strickStatus: true,
      ...sessionFilter
    }).lean();

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
    } else {
      // No session-matching data: return default streak 0
      currentStreak = { count: 0, startDate: null, endDate: null };
    }

    // --- Update bonus point if valid
    let updatedBonus = user.bonuspoint || 0;
    if (!isNaN(bonuspoint)) {
      updatedBonus += bonuspoint;
      await User.findByIdAndUpdate(userId, { bonuspoint: updatedBonus });
    }

    // --- Prepare response
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


 exports.getAssignedwithClass = async (req, res) => {
  try {
    const { classId } = req.params;

    if (!classId) {
      return res.status(400).json({ message: 'classId is required.' });
    }

    const assignedList = await Assigned.find({ classId })
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
