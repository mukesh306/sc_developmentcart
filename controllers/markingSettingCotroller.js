
const MarkingSetting = require('../models/markingSetting');

exports.createOrUpdateSettings = async (req, res) => {
  const { maxMarkPerQuestion, negativeMarking } = req.body;
  if (maxMarkPerQuestion === undefined || negativeMarking === undefined) {
    return res.status(400).json({ message: "Both maxMarkPerQuestion and negativeMarking are required." });
  }
  try {
    let setting = await MarkingSetting.findOne();
    if (!setting) {
      setting = new MarkingSetting({ maxMarkPerQuestion, negativeMarking });
    } else {
      setting.maxMarkPerQuestion = maxMarkPerQuestion;
      setting.negativeMarking = negativeMarking;
    }
    await setting.save();
    res.status(200).json({ message: "Marking settings updated successfully.", setting });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
 
exports.getSettings = async (req, res) => {
  try {
    const setting = await MarkingSetting.findOne();
    if (!setting) {
      return res.status(404).json({ message: "Marking settings not found." });
    }
    res.json(setting);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
