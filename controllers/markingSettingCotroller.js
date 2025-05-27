
const MarkingSetting = require('../models/markingSetting');


exports.createOrUpdateSettings = async (req, res) => {
  const { maxMarkPerQuestion, negativeMarking } = req.body;

  try {
    const userId = req.user._id;

    let setting = await MarkingSetting.findOne();

    
    if (!setting) {
      setting = new MarkingSetting({
        createdBy: userId,
      });

    
      if (maxMarkPerQuestion !== undefined) {
        setting.maxMarkPerQuestion = maxMarkPerQuestion;
      }

      if (negativeMarking !== undefined) {
        setting.negativeMarking = negativeMarking;
      }
    } else {
      if (maxMarkPerQuestion !== undefined) {
        setting.maxMarkPerQuestion = maxMarkPerQuestion;
      }

      if (negativeMarking !== undefined) {
        setting.negativeMarking = negativeMarking;
      }

      setting.createdBy = userId;
    }

    await setting.save();

    res.status(200).json({
      message: "Marking settings saved successfully.",
      setting,
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
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
