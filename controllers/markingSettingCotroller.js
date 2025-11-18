
const MarkingSetting = require('../models/markingSetting');
const Schoolerexam = require("../models/Schoolerexam");

exports.createOrUpdateSettings = async (req, res) => {
  const {
    maxMarkPerQuestion,
    negativeMarking,
    totalquiz,
    totalnoofquestion,
    weeklyBonus,
    monthlyBonus,
    experiencePoint,
    maxdailyexperience,
    dailyExperience,
     deductions,
     bufferTime
  } = req.body;

  try {
    const userId = req.user._id;

    let setting = await MarkingSetting.findOne();

    if (!setting) {
      setting = new MarkingSetting({ createdBy: userId });
    } else {
      setting.createdBy = userId; 
    }

    // Update fields if provided
    if (maxMarkPerQuestion !== undefined) {
      setting.maxMarkPerQuestion = maxMarkPerQuestion;
    }

    if (negativeMarking !== undefined) {
      setting.negativeMarking = negativeMarking;
    }

    if (totalquiz !== undefined) {
      setting.totalquiz = totalquiz;
    }

    if (totalnoofquestion !== undefined) {
      setting.totalnoofquestion = totalnoofquestion;
    }

    if (weeklyBonus !== undefined) {
      setting.weeklyBonus = weeklyBonus;
    }

    if (monthlyBonus !== undefined) {
      setting.monthlyBonus = monthlyBonus;
    }
   
    if (experiencePoint !== undefined) {
      setting.experiencePoint = experiencePoint;
    }
    if (dailyExperience !== undefined) {
      setting.dailyExperience = dailyExperience;
    }
     if (deductions !== undefined) {
      setting.deductions = deductions;
    }
     if (maxdailyexperience !== undefined) {
      setting.maxdailyexperience = maxdailyexperience;
    }
     if (bufferTime !== undefined) {
      setting.bufferTime = bufferTime;
    }

    await setting.save();

    res.status(200).json({
      message: "Marking settings saved successfully.",
      setting,
    });

  } catch (err) {
    console.error("Error in createOrUpdateSettings:", err);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

exports.getSettings = async (req, res) => {
  try {
    const setting = await MarkingSetting.findOne().populate('createdBy', 'email');
    if (!setting) {
      return res.status(404).json({ message: "Marking settings not found." });
    }
    res.json(setting);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// exports.bufferTime = async (req, res) => {
//   try {
//     const { examId } = req.params;

//     if (!examId) {
//       return res.status(400).json({ message: "examId is required." });
//     }

//     // ✅ 1. Find the exam by ID
//     const exam = await Schoolerexam.findById(examId)
//       .select("ScheduleDate ScheduleTime");

//     if (!exam) {
//       return res.status(404).json({ message: "Exam not found." });
//     }

//     // ✅ 2. Get bufferTime from MarkingSetting
//     const setting = await MarkingSetting.findOne()
//       .select("bufferTime")

//     if (!setting) {
//       return res.status(404).json({ message: "Marking settings not found." });
//     }

//     // ✅ 3. Combine both results
//     res.status(200).json({
//       bufferTime: setting.bufferTime,
//       createdBy: setting.createdBy,
//       ScheduleDate: exam.ScheduleDate,
//       ScheduleTime: exam.ScheduleTime,
//     });

//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };


exports.bufferTime = async (req, res) => {
  try {
    const { examId } = req.params;

    if (!examId) {
      return res.status(400).json({ message: "examId is required." });
    }

    // 🔹 Get Exam Data
    const exam = await Schoolerexam.findById(examId)
      .select("ScheduleDate ScheduleTime ScheduleTitle ScheduleType createdAt updatedAt");

    if (!exam) {
      return res.status(404).json({ message: "Exam not found." });
    }

    // 🔹 Get Buffer Time Setting
    const setting = await MarkingSetting.findOne()
      .select("bufferTime createdBy");

    if (!setting) {
      return res.status(404).json({ message: "Marking settings not found." });
    }

    // 🔥 Convert bufferTime into ms
    const bufferDuration = setting.bufferTime * 60 * 1000;

    // 🔥 Convert ScheduleTime to timestamp (ms) → FIXED (NO NEGATIVE)
    const [year, month, day] = exam.ScheduleDate.split("-").map(Number);
    const [hh, mm, ss] = exam.ScheduleTime.split(":").map(Number);

    // 👇 THIS FIX ENSURES NO NEGATIVE TIMESTAMP
    const givenTime = new Date(year, month - 1, day, hh, mm, ss).getTime();

    res.status(200).json({
      bufferTime: setting.bufferTime,
      bufferDuration,
      serverNow: Date.now(),
      givenTime,

      ScheduleDate: exam.ScheduleDate,
      ScheduleTime: exam.ScheduleTime,
      ScheduleTitle: exam.ScheduleTitle,
      ScheduleType: exam.ScheduleType,
      createdAt: exam.createdAt,
      updatedAt: exam.updatedAt,

      createdBy: setting.createdBy
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


