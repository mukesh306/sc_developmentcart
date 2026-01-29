

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/admin');   
const Admin1 = require('../models/admin1'); 
const OrganizationSign = require('../models/organizationSign');     

module.exports = async (req, res, next) => {
  try {
    let token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    let user = await User.findById(decoded.id);
    if (user) {
      req.user = user;
      req.role = 'user';
      return next();
    }

    user = await Admin.findById(decoded.id);
    if (user) {
      req.user = user;
      req.role = 'superadmin';
      return next();
    }

    user = await Admin1.findById(decoded.id);
    if (user) {
      req.user = user;
      req.role = 'admin';
      return next();
    }

    user = await OrganizationSign.findById(decoded.id);
    if (user) {
      req.user = user;
      req.role = 'OrganizationSign';
      return next();
    }

    return res.status(401).json({ message: 'Invalid token or user not found' });

  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(401).json({ message: 'Token is not valid', error: err.message });
  }
};























// const jwt = require('jsonwebtoken');
// const Admin = require('../models/admin');   
// const Admin1 = require('../models/admin1'); 
// const User = require('../models/User');     
// const OrganizationSign = require('../models/organizationSign');     

// module.exports = async (req, res, next) => {
//   try {
//     const token = req.header('Authorization')?.replace('Bearer ', '');
//     if (!token) {
//       return res.status(401).json({ message: 'No token, authorization denied' });
//     }
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     console.log("Decoded Token: ", decoded);
//     let user = await User.findById(decoded.id);
//     if (user) {
//       req.user = user;
//       req.role = 'user';
//       return next();
//     }

//     user = await Admin.findById(decoded.id);
//     if (user) {
//       req.user = user;
//       req.role = 'superadmin';
//       return next();
//     }
//     user = await Admin1.findById(decoded.id);
//     if (user) {
//       req.user = user;
//       req.role = 'admin';
//       return next();
//     }
//     user = await OrganizationSign.findById(decoded.id);
//     if (user) {
//       req.user = user;
//       req.role = 'OrganizationSign';
//       return next();
//     }

//     return res.status(401).json({ message: 'Invalid token or user not found' });

//   } catch (err) {
//     console.error('Auth middleware error:', err);
//     return res.status(401).json({ message: 'Token is not valid', error: err.message });
//   }
// };






