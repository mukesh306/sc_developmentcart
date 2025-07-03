const User = require('../models/User');
const moment = require('moment');

const checkUserSession = async (req, res, next) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId).lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (!user.session) {
      return res.status(400).json({ message: 'User session not found.' });
    }

    // 🎯 Get current session
    const currentMonth = moment().month(); // 0-based (Jan = 0)
    const currentYear = moment().year();
    const sessionStartYear = currentMonth >= 5 ? currentYear : currentYear - 1;
    const sessionEndYear = sessionStartYear + 1;
    const currentSession = `${sessionStartYear}-${sessionEndYear}`;

    console.log('User Session:', user.session);
    console.log('Current Session:', currentSession);

    if (user.session !== currentSession) {
      return res.status(403).json({
        message: 'Session expired. You cannot access this data.',
        expectedSession: currentSession,
        yourSession: user.session
      });
    }

    next();
  } catch (error) {
    console.error('Session validation error:', error);
    return res.status(500).json({ message: 'Session validation failed.', error: error.message });
  }
};

module.exports = checkUserSession;
