



// const jwt = require('jsonwebtoken');
// const Admin = require('../models/admin');
// const Admin1 = require('../models/admin1');
// const User = require('../models/User'); 

// module.exports = async (req, res, next) => {
//   try {
//     const token = req.header('Authorization')?.replace('Bearer ', '');
//     if (!token) {
//       return res.status(401).json({ message: 'No token, authorization denied' });
//     }

//     // Decode the token
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     console.log("Decoded Token: ", decoded); 

//     let user = await User.findById(decoded.id);
//     if (!user) {
//       // If not found in User, check Admin
//       user = await Admin.findById(decoded.id);
//     }

//     if (!user) {
//       return res.status(401).json({ message: 'Invalid token or user not found' });
//     }

//     req.user = user;
//     next();
//   } catch (err) {
//     console.error('Auth middleware error:', err);
//     res.status(401).json({ message: 'Token is not valid', error: err.message });
//   }
// };


const jwt = require('jsonwebtoken');
const Admin = require('../models/admin');   // superadmin
const Admin1 = require('../models/admin1'); // admin
const User = require('../models/User');     // optional user model

module.exports = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Decode the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded Token: ", decoded);

    // 1. Check in User model
    let user = await User.findById(decoded.id);
    if (user) {
      req.user = user;
      req.role = 'user';
      return next();
    }

    // 2. Check in Admin (superadmin)
    user = await Admin.findById(decoded.id);
    if (user) {
      req.user = user;
      req.role = 'superadmin';
      return next();
    }

    // 3. Check in Admin1 (admin)
    user = await Admin1.findById(decoded.id);
    if (user) {
      req.user = user;
      req.role = 'admin';
      return next();
    }

    return res.status(401).json({ message: 'Invalid token or user not found' });

  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({ message: 'Token is not valid', error: err.message });
  }
};
