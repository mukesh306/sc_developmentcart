
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

    // 1️⃣ Find exam
    const exam = await Schoolerexam.findById(examId)
      .select("ScheduleDate ScheduleTime");

    if (!exam) {
      return res.status(404).json({ message: "Exam not found." });
    }

    // 2️⃣ Find marking setting
    const setting = await MarkingSetting.findOne()
      .select("bufferTime createdBy");

    if (!setting) {
      return res.status(404).json({ message: "Marking settings not found." });
    }

    // 🔥 Convert bufferTime → duration in ms
    const bufferDuration = setting.bufferTime * 60 * 1000;

    // 🔥 Convert ScheduleDate + ScheduleTime → timestamp (ms)
    // ScheduleDate example: "2024-11-20"
    // ScheduleTime example: "14:30:00"
    const [year, month, day] = exam.ScheduleDate.split("-").map(Number);
    const [hh, mm, ss] = exam.ScheduleTime.split(":").map(Number);

    const givenTime = new Date(Date.UTC(year, month - 1, day, hh, mm, ss)).getTime();

    // 3️⃣ Response
    res.status(200).json({
      bufferDuration,       // buffer in ms
      serverNow: Date.now(),// current server timestamp
      givenTime,            // ScheduleTime converted to ms
      createdBy: setting.createdBy
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
