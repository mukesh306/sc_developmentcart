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



// exports.getAssignedListUser = async (req, res) => {
//   try {
//     const userId = req.user._id;
//     const user = await User.findById(userId).lean();

//     if (!user?.endDate) {
//       return res.status(200).json({ data: [] });
//     }

//     const userEndDate = user.endDate;
//     const userClassId = user.className?.toString();

   
//     const dailyFirstScores = await TopicScore.aggregate([
//       {
//         $match: {
//           userId: new mongoose.Types.ObjectId(userId),
//           endDate: userEndDate, 
//           classId: userClassId
//         }
//       },
//       { $sort: { scoreDate: 1, createdAt: 1 } },
//       {
//         $group: {
//           _id: {
//             date: { $dateToString: { format: "%Y-%m-%d", date: "$scoreDate" } }
//           },
//           doc: { $first: "$$ROOT" }
//         }
//       },
//       { $replaceRoot: { newRoot: "$doc" } }
//     ]);

//     const grouped = {};
//     for (let s of dailyFirstScores) {
//       if (!s.learningId) continue;
//       const lid = s.learningId.toString();
//       if (!grouped[lid]) grouped[lid] = [];
//       grouped[lid].push(s.score);
//     }

//     const averageScoreMap = {};
//     for (const lid in grouped) {
//       const arr = grouped[lid];
//       const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
//       averageScoreMap[lid] = parseFloat(avg.toFixed(2));
//     }

//     const assignedQuery = user.className ? { classId: user.className } : {};
//     const assignedList = await Assigned.find(assignedQuery)
//       .populate('learning')
//       .populate('learning2')
//       .populate('learning3')
//       .populate('learning4')
//       .lean();

//     for (let item of assignedList) {
//       let classInfo = await School.findById(item.classId).lean();
//       if (!classInfo) {
//         classInfo = await College.findById(item.classId).lean();
//       }
//       item.classInfo = classInfo || null;

//       const getAverage = (learningObj) => {
//         if (learningObj && learningObj._id) {
//           const lid = learningObj._id.toString();
//           return Object.prototype.hasOwnProperty.call(averageScoreMap, lid)
//             ? averageScoreMap[lid]
//             : 0;
//         }
//         return 0;
//       };

//       ['learning', 'learning2', 'learning3', 'learning4'].forEach(field => {
//         if (!item[field] || Object.keys(item[field]).length === 0) {
//           item[field] = null;
//         }
//       });

//       item.learningAverage = getAverage(item.learning);
//       item.learning2Average = getAverage(item.learning2);
//       item.learning3Average = getAverage(item.learning3);
//       item.learning4Average = getAverage(item.learning4);
//     }

//     res.status(200).json({ data: assignedList });

//   } catch (error) {
//     console.error('Get Assigned Error:', error);
//     res.status(500).json({ message: 'Internal server error', error: error.message });
//   }
// };

exports.getAssignedListUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId).lean();

    if (!user?.endDate) {
      return res.status(200).json({
        enrolledDate: user?.updatedAt
          ? moment(user.updatedAt).format('YYYY-MM-DD')
          : null,
        currentDate: moment().format('YYYY-MM-DD'),
        updatedAt: user?.updatedAt
          ? moment(user.updatedAt).format('YYYY-MM-DD')
          : null,
        data: []
      });
    }

    const userEndDate = user.endDate;
    const userClassId = user.className?.toString();

    const dailyFirstScores = await TopicScore.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
          endDate: userEndDate,
          classId: userClassId
        }
      },
      { $sort: { scoreDate: 1, createdAt: 1 } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$scoreDate" } }
          },
          doc: { $first: "$$ROOT" }
        }
      },
      { $replaceRoot: { newRoot: "$doc" } }
    ]);

    const grouped = {};
    for (let s of dailyFirstScores) {
      if (!s.learningId) continue;
      const lid = s.learningId.toString();
      if (!grouped[lid]) grouped[lid] = [];
      grouped[lid].push(s.score);
    }

    const averageScoreMap = {};
    for (const lid in grouped) {
      const arr = grouped[lid];
      const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
      averageScoreMap[lid] = parseFloat(avg.toFixed(2));
    }

    const assignedQuery = user.className ? { classId: user.className } : {};
    const assignedList = await Assigned.find(assignedQuery)
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

      const getAverage = (learningObj) => {
        if (learningObj && learningObj._id) {
          const lid = learningObj._id.toString();
          return Object.prototype.hasOwnProperty.call(averageScoreMap, lid)
            ? averageScoreMap[lid]
            : 0;
        }
        return 0;
      };

      ['learning', 'learning2', 'learning3', 'learning4'].forEach(field => {
        if (!item[field] || Object.keys(item[field]).length === 0) {
          item[field] = null;
        }
      });

      item.learningAverage = getAverage(item.learning);
      item.learning2Average = getAverage(item.learning2);
      item.learning3Average = getAverage(item.learning3);
      item.learning4Average = getAverage(item.learning4);
    }

    res.status(200).json({
      enrolledDate: user.updatedAt
        ? moment(user.updatedAt).format('YYYY-MM-DD')
        : null,
      currentDate: moment().format('YYYY-MM-DD'),
      updatedAt: user.updatedAt
        ? moment(user.updatedAt).format('YYYY-MM-DD')
        : null,
      data: assignedList
    });

  } catch (error) {
    console.error('Get Assigned Error:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error.message
    });
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
    const bonuspointQuery = Number(req.query.bonuspoint);

    const markingSetting = await MarkingSetting.findOne({}, {
      weeklyBonus: 1,
      monthlyBonus: 1,
      _id: 0
    }).sort({ createdAt: -1 }).lean();

    if (!markingSetting) {
      return res.status(404).json({ message: 'Marking setting not found.' });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const session = user.session;
    const classId = user.className?.toString();

    let bonuspoint = 0;
    let weeklyCount = 0;
    let monthlyCount = 0;
    let currentStreak = { count: 0, startDate: null, endDate: null };
    let matched = false;

    if (session && classId) {
      const scores = await LearningScore.find({
        userId,
        session,
        classId,
        strickStatus: true
      }).lean();

      const topicScores = await TopicScore.find({
        userId,
        session,
        classId,
        strickStatus: true
      }).lean();

      if (scores.length > 0 && topicScores.length > 0) {
        matched = true;
        const allDatesSet = new Set();

        scores.forEach(score => {
          allDatesSet.add(moment(score.scoreDate).format('YYYY-MM-DD'));
        });
        topicScores.forEach(score => {
          allDatesSet.add(moment(score.updatedAt).format('YYYY-MM-DD'));
        });

        const sortedDates = Array.from(allDatesSet).sort();
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

        weeklyCount = currentStreak.count >= 7 ? 7 : currentStreak.count;
        monthlyCount = currentStreak.count >= 30 ? 30 : currentStreak.count;

        // Add bonus only if match found
        if (!isNaN(bonuspointQuery)) {
          bonuspoint = (user.bonuspoint || 0) + bonuspointQuery;
          await User.findByIdAndUpdate(userId, { bonuspoint });
        } else {
          bonuspoint = user.bonuspoint || 0;
        }
      }
    }

    // If no match, use 0 bonuspoint regardless of what was in DB
    if (!matched) {
      bonuspoint = 0;
    }

    return res.status(200).json({
      message: matched
        ? (!isNaN(bonuspointQuery) ? 'Bonus point added successfully.' : 'Streak data fetched successfully.')
        : 'No valid session/classId or no streak data.',
      bonuspoint,
      weekly: {
        count: weeklyCount,
        startDate: weeklyCount === 7 ? currentStreak.startDate : null,
        endDate: weeklyCount === 7 ? currentStreak.endDate : null
      },
      monthly: {
        count: monthlyCount,
        startDate: monthlyCount === 30 ? currentStreak.startDate : null,
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

//     const markingSetting = await MarkingSetting.findOne({}, { weeklyBonus: 1, monthlyBonus: 1, _id: 0 })
//       .sort({ createdAt: -1 })
//       .lean();

//     if (!markingSetting) {
//       return res.status(404).json({ message: 'Marking setting not found.' });
//     }

//     const user = await User.findById(userId).lean();
//     if (!user) {
//       return res.status(404).json({ message: 'User not found.' });
//     }

//     const sessionFilter = user.session ? { session: user.session } : {};

//     // --- Fetch LearningScore & TopicScore with session match
//     const scores = await LearningScore.find({
//       userId,
//       strickStatus: true,
//       ...sessionFilter
//     }).lean();

//     const topicScores = await TopicScore.find({
//       userId,
//       strickStatus: true,
//       ...sessionFilter
//     }).lean();

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
//     } else {
//       // No session-matching data: return default streak 0
//       currentStreak = { count: 0, startDate: null, endDate: null };
//     }

//     // --- Update bonus point if valid
//     let updatedBonus = user.bonuspoint || 0;
//     if (!isNaN(bonuspoint)) {
//       updatedBonus += bonuspoint;
//       await User.findByIdAndUpdate(userId, { bonuspoint: updatedBonus });
//     }

//     // --- Prepare response
//    const weeklyCount = currentStreak.count >= 7 ? 7 : currentStreak.count;
// const monthlyCount = currentStreak.count >= 30 ? 30 : currentStreak.count;

// return res.status(200).json({
//   message: !isNaN(bonuspoint) ? 'Bonus point added successfully.' : 'Streak fetched successfully.',
//   bonuspoint: updatedBonus,
//   weekly: {
//     count: weeklyCount,
//     startDate: weeklyCount === 7 ? currentStreak.startDate : null,
//     endDate: weeklyCount === 7 ? currentStreak.endDate : null
//   },
//   monthly: {
//     count: monthlyCount,
//     startDate: monthlyCount === 30 ? currentStreak.startDate : null,
//     endDate: monthlyCount === 30 ? currentStreak.endDate : null
//   },
//   weeklyBonus: markingSetting.weeklyBonus || 0,
//   monthlyBonus: markingSetting.monthlyBonus || 0
// });


//   } catch (error) {
//     console.error('Error in assignBonusPoint:', error);
//     return res.status(500).json({ message: error.message });
//   }
// };


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


exports.WeeklyMonthlyCount = async (req, res) => {
  try {
    // 🔹 userId ab params se aayega
    const userId = req.params.userId;

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const session = user.session;
    const classId = user.className?.toString();

    let weekCount = user.weekCount || 0;
    let monthCount = user.monthCount || 0;
    let currentStreak = { count: 0, startDate: null, endDate: null };

    if (session && classId) {
      const scores = await LearningScore.find({
        userId,
        session,
        classId,
        strickStatus: true,
      }).lean();

      const topicScores = await TopicScore.find({
        userId,
        session,
        classId,
        strickStatus: true,
      }).lean();

      if (scores.length > 0 && topicScores.length > 0) {
        const allDatesSet = new Set();

        scores.forEach((score) => {
          allDatesSet.add(moment(score.scoreDate).format("YYYY-MM-DD"));
        });
        topicScores.forEach((score) => {
          allDatesSet.add(moment(score.updatedAt).format("YYYY-MM-DD"));
        });

        const sortedDates = Array.from(allDatesSet).sort();
        let streakStart = null;
        let tempStreak = [];

        for (let i = 0; i < sortedDates.length; i++) {
          const curr = moment(sortedDates[i]);
          const prev = i > 0 ? moment(sortedDates[i - 1]) : null;

          if (!prev || curr.diff(prev, "days") === 1) {
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
            endDate: tempStreak[tempStreak.length - 1],
          };
        }

        // ✅ Weekly check (increment only when exact multiple of 7)
        if (currentStreak.count % 7 === 0) {
          weekCount = weekCount + 1;
        }

        // ✅ Monthly check (increment only when exact multiple of 30)
        if (currentStreak.count % 30 === 0) {
          monthCount = monthCount + 1;
        }

        // Update user with new counts
        await User.findByIdAndUpdate(userId, {
          weekCount,
          monthCount,
        });
      }
    }

    return res.status(200).json({
      message: "Weekly/Monthly streak counter updated.",
      currentStreak,
      weekCount,
      monthCount,
    });
  } catch (error) {
    console.error("Error in WeeklyMonthlyCount:", error);
    return res.status(500).json({ message: error.message });
  }
};
