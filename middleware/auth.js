// const jwt = require('jsonwebtoken');
// const User = require('../models/admin');

// module.exports = async (req, res, next) => {
//   try {
//     const token = req.header('Authorization')?.replace('Bearer ', '');
//     if (!token) {
//       return res.status(401).json({ message: 'No token, authorization denied' });
//     }

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
//     const user = await User.findById(decoded.id);
//     if (!user) {
//       return res.status(401).json({ message: 'Invalid token' });
//     }

//     req.user = user; // ✅ now contains full user document with _id, email, etc.
//     next();
//   } catch (err) {
//     res.status(401).json({ message: 'Token is not valid' });
//   }
// };




const jwt = require('jsonwebtoken');
const Admin = require('../models/admin');
const User = require('../models/User'); 

module.exports = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded Token: ", decoded); 

    let user = await User.findById(decoded.id);
    if (!user) {
      // If not found in User, check Admin
      user = await Admin.findById(decoded.id);
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid token or user not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.status(401).json({ message: 'Token is not valid', error: err.message });
  }
};
