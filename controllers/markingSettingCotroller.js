
const MarkingSetting = require('../models/markingSetting');

exports.createOrUpdateSettings = async (req, res) => {
  const {
    maxMarkPerQuestion,
    negativeMarking,
    totalquiz,
    totalnoofquestion,
    weeklyBonus,
    monthlyBonus
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
