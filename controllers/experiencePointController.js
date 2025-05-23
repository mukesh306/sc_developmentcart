const ExperiencePoint = require('../models/experiencePoint');


// exports.upsertSettings = async (req, res) => {
//   try {
//     const {
//       perLevel,
//       maxExpDaily,
//       deductions,
//       eachQuestion,
//       negativeMarking,
//       streak7Days,
//       streak30Days
//     } = req.body;

//     const maxExp = Number(maxExpDaily);
//     const allotmentFormula = (maxExp / 100) * score;
//     let settings = await ExperiencePoint.findOne();
//     if (!settings) {
//       settings = new ExperiencePoint({
//         perLevel,
//         maxExpDaily,
//         allotmentFormula,
//         deductions,
//         eachQuestion,
//         negativeMarking,
//         streak7Days,
//         streak30Days
//       });
//     } else {
//       settings.perLevel = perLevel;
//       settings.maxExpDaily = maxExpDaily;
//       settings.allotmentFormula = allotmentFormula;
//       settings.deductions = deductions;
//       settings.eachQuestion = eachQuestion;
//       settings.negativeMarking = negativeMarking;
//       settings.streak7Days = streak7Days;
//       settings.streak30Days = streak30Days;
//     }

//     await settings.save();

//     res.status(200).json({
//       message: 'Settings saved successfully',
//       data: settings
//     });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// };

exports.upsertSettings = async (req, res) => {
  try {
    const {
      perLevel,
      maxExpDaily,
      deductions,
      eachQuestion,
      negativeMarking,
      streak7Days,
      streak30Days,
      learningId, // <-- Make sure frontend sends this in request body
      classId      // <-- Optional, if needed to narrow search
    } = req.body;

    const maxExp = Number(maxExpDaily);

    // 🔍 Fetch assigned record to get average score for learningId
    const assigned = await Assigned.findOne({
      $or: [
        { learning: learningId },
        { learning2: learningId },
        { learning3: learningId },
        { learning4: learningId }
      ],
      ...(classId && { classId }) // Optional filter
    });

    if (!assigned) {
      return res.status(404).json({ message: 'Assigned record not found for the provided learningId' });
    }

    // ✅ Identify which learning average score to use
    let score = null;
    if (assigned.learning?.toString() === learningId) {
      score = assigned.learningAverage;
    } else if (assigned.learning2?.toString() === learningId) {
      score = assigned.learning2Average;
    } else if (assigned.learning3?.toString() === learningId) {
      score = assigned.learning3Average;
    } else if (assigned.learning4?.toString() === learningId) {
      score = assigned.learning4Average;
    }

    if (score == null) {
      return res.status(400).json({ message: 'Average score not available for this learningId.' });
    }

    const allotmentFormula = (maxExp / 100) * score;

    let settings = await ExperiencePoint.findOne();
    if (!settings) {
      settings = new ExperiencePoint({
        perLevel,
        maxExpDaily,
        allotmentFormula,
        deductions,
        eachQuestion,
        negativeMarking,
        streak7Days,
        streak30Days
      });
    } else {
      settings.perLevel = perLevel;
      settings.maxExpDaily = maxExpDaily;
      settings.allotmentFormula = allotmentFormula;
      settings.deductions = deductions;
      settings.eachQuestion = eachQuestion;
      settings.negativeMarking = negativeMarking;
      settings.streak7Days = streak7Days;
      settings.streak30Days = streak30Days;
    }

    await settings.save();
    res.status(200).json({
      message: 'Experience saved successfully',
      data: settings
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};



exports.getSettings = async (req, res) => {
  try {
    const settings = await ExperiencePoint.findOne().lean();

    if (!settings) {
      return res.status(404).json({ message: 'Settings not found' });
    }

    res.status(200).json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
