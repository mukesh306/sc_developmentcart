const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const College = require('../models/college');
const School = require('../models/school');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const Admin1 = require('../models/admin1'); 
const UserHistory = require('../models/UserHistory');
const UserForAdmin = require("../models/userforAdmin");
const ExamResult = require('../models/examResult');
const Schoolerexam = require('../models/Schoolerexam');
const ExamUserStatus = require("../models/ExamUserStatus");
const Location = require("../models/location");

const fs = require('fs');
const path = require('path');
// const moment = require('moment');
const moment = require('moment-timezone');


exports.signup = async (req, res) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      mobileNumber,
      email,
      password,
      confirmPassword
    } = req.body;

    
    if (!firstName) return res.status(400).json({ message: 'First Name can’t remain empty.' });
    if (!lastName) return res.status(400).json({ message: 'Last Name can’t remain empty.' });
    if (!mobileNumber) return res.status(400).json({ message: 'Mobile Number can’t remain empty.' });
    if (!email) return res.status(400).json({ message: 'Email address can’t remain empty.' });
    if (!password) return res.status(400).json({ message: 'Create Password can’t remain empty.' });
    if (!confirmPassword) return res.status(400).json({ message: 'Confirm Password can’t remain empty.' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(mobileNumber)) {
      return res.status(400).json({ message: 'Mobile Number must be exactly 10 digits and contain only numbers.' });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: 'Password must contain at least 8 characters with a mix of uppercase, lowercase letters, and numbers.'
      });
    }

    
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

 
    const existingUser = await User.findOne({ $or: [{ email }, { mobileNumber }] });
    if (existingUser) {
      return res.status(409).json({ message: 'User with this email or mobile already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      firstName,
      middleName,
      lastName,
      mobileNumber,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      message: 'Registered successfully. Redirecting to complete your profile.',
      token,
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error during signup.', error: error.message });
  }
};

exports.Userlogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required.' });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: 'User not found.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: 'Invalid Password.' });

    
    const payload = { id: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.status(200).json({
      message: 'Login successful.',
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
};


exports.completeProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    let {
      countryId,
      stateId,
      cityId,
      pincode,
      studentType,
      schoolName,
      instituteName,
      collegeName,
      className
    } = req.body;

    if (pincode && !/^\d+$/.test(pincode)) {
      return res.status(400).json({ message: 'Invalid Pincode' });
    }

    const updatedFields = {
      pincode,
      studentType,
      schoolName,
      instituteName,
      collegeName,
    };

    if (mongoose.Types.ObjectId.isValid(countryId)) updatedFields.countryId = countryId;
    if (mongoose.Types.ObjectId.isValid(stateId)) updatedFields.stateId = stateId;
    if (mongoose.Types.ObjectId.isValid(cityId)) updatedFields.cityId = cityId;
    if (mongoose.Types.ObjectId.isValid(className)) updatedFields.className = className;

    if (req.files?.aadharCard?.[0]) {
      updatedFields.aadharCard = req.files.aadharCard[0].path;
    }
    if (req.files?.marksheet?.[0]) {
      updatedFields.marksheet = req.files.marksheet[0].path;
    }

    // Update user
    let user = await User.findByIdAndUpdate(userId, updatedFields, { new: true })
      .populate('countryId')
      .populate('stateId')
      .populate('cityId');

    // Fetch class details
    let classDetails = null;
    if (mongoose.Types.ObjectId.isValid(className)) {
      classDetails =
        (await School.findById(className)) ||
        (await College.findById(className)) ;
        // (await Institute.findById(className));
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    if (user.aadharCard && fs.existsSync(user.aadharCard)) {
      user.aadharCard = `${baseUrl}/uploads/${path.basename(user.aadharCard)}`;
    }
    if (user.marksheet && fs.existsSync(user.marksheet)) {
      user.marksheet = `${baseUrl}/uploads/${path.basename(user.marksheet)}`;
    }

    const formattedUser = {
      ...user._doc,
      country: user.countryId?.name || '',
      state: user.stateId?.name || '',
      city: user.cityId?.name || '',
      institutionName: schoolName || collegeName || instituteName || '',
      institutionType: studentType || '',
      classOrYear: classDetails?.name || '',
    };

    res.status(200).json({
      message: 'Profile updated. Redirecting to home page.',
      user: formattedUser
    });

  } catch (error) {
    console.error('Complete Profile Error:', error);
    res.status(500).json({ message: error.message });
  }
};




// exports.getUserProfile = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     let user = await User.findById(userId)
//       .populate('countryId', 'name')
//       .populate('stateId', 'name')
//       .populate('cityId', 'name')
//       .populate({
//         path: 'updatedBy',
//         select: 'email session startDate endDate endTime name role'
//       });

//     if (!user) {
//       return res.status(404).json({ message: 'User not found.' });
//     }

//     let classId = user.className;
//     let classDetails = null;

//     if (mongoose.Types.ObjectId.isValid(classId)) {
//       classDetails =
//         (await School.findById(classId)) ||
//         (await College.findById(classId));
//     }

//     // const baseUrl = `${req.protocol}://${req.get('host')}`;
//       const baseUrl = `${req.protocol}://${req.get('host')}`.replace('http://', 'https://');

//     if (user.aadharCard && fs.existsSync(user.aadharCard)) {
//       user.aadharCard = `${baseUrl}/uploads/${path.basename(user.aadharCard)}`;
//     }
//     if (user.marksheet && fs.existsSync(user.marksheet)) {
//       user.marksheet = `${baseUrl}/uploads/${path.basename(user.marksheet)}`;
//     }

//     if (!classDetails || classDetails.price == null) {
//       classId = null;
//       await User.findByIdAndUpdate(userId, { className: null });
//       user.className = null;
//     } else {
//       const institutionUpdatedBy = classDetails.updatedBy || null;

//       if (institutionUpdatedBy) {
//         const existingUser = await User.findById(userId).select('updatedBy');

//         // ✅ Pehli baar skip, dusri baar change hone par clone
//         if (
//           existingUser.updatedBy && 
//           existingUser.updatedBy.toString() !== institutionUpdatedBy?.toString()
//         ) {
//           const userData = user.toObject();
//           const originalId = userData._id;
//           delete userData._id;

//           await UserHistory.create({
//             ...userData,
//             _id: new mongoose.Types.ObjectId(),
//             originalUserId: originalId,
//             clonedAt: new Date()
//           });

//           await User.findByIdAndUpdate(userId, { updatedBy: institutionUpdatedBy });
//           user.updatedBy = institutionUpdatedBy;
//         }
//       }
//     }

//     // Sync session-related fields from updatedBy to user
//     if (user.updatedBy && typeof user.updatedBy === 'object') {
//       const updates = {};

//       if (user.updatedBy.session && user.session !== user.updatedBy.session) {
//         updates.session = user.updatedBy.session;
//         user.session = user.updatedBy.session;
//       }

//       if (user.updatedBy.startDate && user.startDate !== user.updatedBy.startDate) {
//         updates.startDate = user.updatedBy.startDate;
//         user.startDate = user.updatedBy.startDate;
//       }

//       if (user.updatedBy.endDate && user.endDate !== user.updatedBy.endDate) {
//         updates.endDate = user.updatedBy.endDate;
//         user.endDate = user.updatedBy.endDate;
//       }

//       if (Object.keys(updates).length > 0) {
//         await User.findByIdAndUpdate(userId, updates);
//       }
//     }

//     // Check if session expired
//     if (user.updatedBy?.endDate) {
//       const rawEndDate = user.updatedBy.endDate.trim();
//       const endDate = moment.tz(rawEndDate, 'DD-MM-YYYY', 'Asia/Kolkata').endOf('day');
//       const currentDate = moment.tz('Asia/Kolkata');

//       if (!endDate.isValid()) {
//         console.warn("⚠️ Invalid endDate. Format must be DD-MM-YYYY");
//       } else if (currentDate.isSameOrAfter(endDate)) {
//         if (user.status !== 'no') {
//           await User.findByIdAndUpdate(userId, { status: 'no' });
//           user.status = 'no';
//         }
//       }
//     }

//     // Final formatted response
//     const formattedUser = {
//       ...user._doc,
//       status: user.status,
//       className: classId,
//       country: user.countryId?.name || '',
//       state: user.stateId?.name || '',
//       city: user.cityId?.name || '',
//       institutionName: user.schoolName || user.collegeName || user.instituteName || '',
//       institutionType: user.studentType || '',
//       updatedBy: user.updatedBy || null
//     };

//     if (classDetails && classDetails.price != null) {
//       formattedUser.classOrYear = classDetails.name;
//     }

//     res.status(200).json({
//       message: 'User profile fetched successfully.',
//       user: formattedUser
//     });
//   } catch (error) {
//     console.error('Get User Profile Error:', error);
//     res.status(500).json({ message: error.message });
//   }
// };


exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // 1) लाओ user (populate कुछ फील्ड्स के साथ)
    let user = await User.findById(userId)
      .populate('countryId', 'name')
      .populate('stateId', 'name')
      .populate('cityId', 'name')
      .populate({
        path: 'updatedBy',
        select: 'email session startDate endDate endTime name role'
      });

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // 2) className से classDetails ढूंढो (School या College)
    let classId = user.className;
    let classDetails = null;

    if (mongoose.Types.ObjectId.isValid(classId)) {
      classDetails =
        (await School.findById(classId)) ||
        (await College.findById(classId));
    }

    // 3) file URLs (aadharCard / marksheet) को public URL बनाना (अगर local path है तो)
    // const baseUrl = `${req.protocol}://${req.get('host')}`;
const baseUrl = `${req.protocol}://${req.get('host')}`.replace('http://', 'https://');
    if (user.aadharCard && fs.existsSync(user.aadharCard)) {
      user.aadharCard = `${baseUrl}/uploads/${path.basename(user.aadharCard)}`;
    }
    if (user.marksheet && fs.existsSync(user.marksheet)) {
      user.marksheet = `${baseUrl}/uploads/${path.basename(user.marksheet)}`;
    }

    // 4) अगर classDetails invalid हो तो className हटाओ
    if (!classDetails || classDetails.price == null) {
      classId = null;
      await User.findByIdAndUpdate(userId, { className: null });
      user.className = null;
    } else {
      // 5) अगर institution.updatedBy बदल गया है तो सिर्फ updatedBy अपडेट करो (clone logic हटाया गया है)
      const institutionUpdatedBy = classDetails.updatedBy || null;

      if (institutionUpdatedBy) {
        const existingUser = await User.findById(userId).select('updatedBy');

        if (existingUser.updatedBy?.toString() !== institutionUpdatedBy.toString()) {
          await User.findByIdAndUpdate(userId, { updatedBy: institutionUpdatedBy });
          user.updatedBy = institutionUpdatedBy;
        }
      }
    }

    // 6) Sync session-related fields from updatedBy (if populated object) to user
    if (user.updatedBy && typeof user.updatedBy === 'object') {
      const updates = {};

      if (user.updatedBy.session && user.session !== user.updatedBy.session) {
        updates.session = user.updatedBy.session;
        user.session = user.updatedBy.session;
      }

      if (user.updatedBy.startDate && user.startDate !== user.updatedBy.startDate) {
        updates.startDate = user.updatedBy.startDate;
        user.startDate = user.updatedBy.startDate;
      }

      if (user.updatedBy.endDate && user.endDate !== user.updatedBy.endDate) {
        updates.endDate = user.updatedBy.endDate;
        user.endDate = user.updatedBy.endDate;
      }

      if (Object.keys(updates).length > 0) {
        await User.findByIdAndUpdate(userId, updates);
      }
    }

    // 7) Check session expiry (using moment-timezone)
    if (user.updatedBy?.endDate) {
      const rawEndDate = String(user.updatedBy.endDate).trim();
      const endDate = moment.tz(rawEndDate, 'DD-MM-YYYY', 'Asia/Kolkata').endOf('day');
      const currentDate = moment.tz('Asia/Kolkata');

      if (!endDate.isValid()) {
        console.warn("⚠️ Invalid endDate. Format must be DD-MM-YYYY");
      } else if (currentDate.isSameOrAfter(endDate)) {
        if (user.status !== 'no') {
          await User.findByIdAndUpdate(userId, { status: 'no' });
          user.status = 'no';
        }
      }
    }

    // 8) Final formatted response
    const formattedUser = {
      ...user._doc,
      status: user.status,
      className: classId,
      country: user.countryId?.name || '',
      state: user.stateId?.name || '',
      city: user.cityId?.name || '',
      institutionName: user.schoolName || user.collegeName || user.instituteName || '',
      institutionType: user.studentType || '',
      updatedBy: user.updatedBy || null
    };

    if (classDetails && classDetails.price != null) {
      formattedUser.classOrYear = classDetails.name;
    }

    return res.status(200).json({
      message: 'User profile fetched successfully.',
      user: formattedUser
    });

  } catch (error) {
    console.error('Get User Profile Error:', error);
    return res.status(500).json({ message: error.message });
  }
};


exports.sendResetOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); 
    const expiry = new Date(Date.now() + 5 * 60 * 1000); 

    user.resetPasswordOTP = otp;
    user.resetPasswordExpires = expiry;
    await user.save();

   
   const transporter = nodemailer.createTransport({
     service: 'gmail',
     auth: {
       user: 'noreply@shikshacart.com', 
       pass: 'xyrx ryad ondf jaum' 
     }
   });

    await transporter.sendMail({
      from: 'noreply@shikshacart.com',
      to: email,
      subject: 'Login OTP',
      text: `Your OTP is: ${otp}`,
    });

    res.status(200).json({ message: 'OTP sent to email.' });
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({ message: error.message });
  }
};


exports.loginWithOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (
      !user.resetPasswordOTP ||
      user.resetPasswordOTP !== otp ||
      new Date() > user.resetPasswordExpires
    ) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.resetPasswordOTP = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
 
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(200).json({
      message: 'Login successful',
      token,
    });
  } catch (error) {
    console.error('OTP Login Error:', error);
    res.status(500).json({ message: error.message });
  }
};



exports.resetPasswordAfterOTPLogin = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: 'Token missing' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Both fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const user = await User.findByIdAndUpdate(userId, { password: hashedPassword }, { new: true });

   
   const transporter = nodemailer.createTransport({
     service: 'gmail',
     auth: {
       user: 'noreply@shikshacart.com', 
       pass: 'xyrx ryad ondf jaum' 
     }
   });

    await transporter.sendMail({
      from: 'noreply@shikshacart.com',
      to: user.email,
      subject: 'Password Changed Successfully',
      text: `Hi ${user.firstName || 'User'},\n\nYour password has been successfully changed. You can now login with your new password.\n\nIf you did not perform this action, please contact support immediately.`,
    });

    res.status(200).json({ message: 'Password updated successfully.' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.SendEmailverifyOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); 
    const expiry = new Date(Date.now() + 5 * 60 * 1000); 
    user.resetPasswordOTP = otp;
    user.resetPasswordExpires = expiry;
    await user.save();

    // Email setup
   const transporter = nodemailer.createTransport({
     service: 'gmail',
     auth: {
       user: 'noreply@shikshacart.com', 
       pass: 'xyrx ryad ondf jaum' 
     }
   });

    await transporter.sendMail({
      from: 'noreply@shikshacart.com',
      to: email,
      subject: 'Email Verify OTP',
      text: `Your OTP is: ${otp}`,
    });

    res.status(200).json({ message: 'OTP sent to email for Verify Email.' });
  } catch (error) {
    console.error('Send OTP Error:', error);
    res.status(500).json({ message: error.message });
  }
};


exports.EmailVerifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (
      !user.resetPasswordOTP ||
      user.resetPasswordOTP !== otp ||
      new Date() > user.resetPasswordExpires
    ) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.resetPasswordOTP = undefined;
    user.resetPasswordExpires = undefined;
    user.VerifyEmail = 'Yes'; 
    await user.save();

    res.status(200).json({
      message: 'Email Verified Successfully',
      VerifyEmail: user.VerifyEmail,
    });
  } catch (error) {
    console.error('Email Verify Error:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.updateUser = async (req, res) => {
  try { 
    const userId = req.params.id;
    const updates = req.body;
    const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({ message: 'User updated successfully.', user: updatedUser });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ 
      message: 'Server error during user update.', 
      error: error.message 
    });
  }
};



// exports.updateProfile = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const existingUser = await User.findById(userId);
//     if (!existingUser) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     if (existingUser.status === 'yes') {
//       return res.status(403).json({ message: 'You are not eligible to update.' });
//     }

//     let {
//       countryId,
//       stateId,
//       cityId,
//       pincode,
//       studentType,
//       schoolName,
//       instituteName,
//       collegeName,
//       className
//     } = req.body;

//     if (pincode && !/^\d+$/.test(pincode)) {
//       return res.status(400).json({ message: 'Invalid Pincode' });
//     }

//     const updatedFields = {
//       pincode,
//       studentType,
//       schoolName,
//       instituteName,
//       collegeName
//     };

//     if (mongoose.Types.ObjectId.isValid(countryId)) updatedFields.countryId = countryId;
//     if (mongoose.Types.ObjectId.isValid(stateId)) updatedFields.stateId = stateId;
//     if (mongoose.Types.ObjectId.isValid(cityId)) updatedFields.cityId = cityId;
//     if (mongoose.Types.ObjectId.isValid(className)) updatedFields.className = className;

//     if (req.files?.aadharCard?.[0]) {
//       updatedFields.aadharCard = req.files.aadharCard[0].path;
//     }

//     if (req.files?.marksheet?.[0]) {
//       updatedFields.marksheet = req.files.marksheet[0].path;
//     }

//     // === Fetch class updatedBy and admin session ===
//     let classDetails = null;
//     if (mongoose.Types.ObjectId.isValid(className)) {
//       classDetails = await School.findById(className) || await College.findById(className);
//       if (classDetails?.updatedBy) {
//         updatedFields.updatedBy = classDetails.updatedBy;

//         // ✅ Also fetch session from admin and assign to user
//         const admin = await Admin1.findById(classDetails.updatedBy);
//         if (admin?.session) {
//           updatedFields.session = admin.session;
//         }
//       }
//     }

//     // === Update user ===
//     const user = await User.findByIdAndUpdate(userId, updatedFields, { new: true })
//       .populate('countryId')
//       .populate('stateId')
//       .populate('cityId')
//       .populate('updatedBy', 'email session startDate endDate');

//     const baseUrl = `${req.protocol}://${req.get('host')}`;
//     if (user.aadharCard && fs.existsSync(user.aadharCard)) {
//       user.aadharCard = `${baseUrl}/uploads/${path.basename(user.aadharCard)}`;
//     }
//     if (user.marksheet && fs.existsSync(user.marksheet)) {
//       user.marksheet = `${baseUrl}/uploads/${path.basename(user.marksheet)}`;
//     }

//     const formattedUser = {
//       ...user._doc,
//       country: user.countryId?.name || '',
//       state: user.stateId?.name || '',
//       city: user.cityId?.name || '',
//       institutionName: schoolName || collegeName || instituteName || '',
//       institutionType: studentType || '',
//       classOrYear: classDetails?.name || '',
//       session: user.session || '',
//       updatedBy: user.updatedBy || null
//     };

//     return res.status(200).json({
//       message: 'Profile updated. Redirecting to home page.',
//       user: formattedUser
//     });

//   } catch (error) {
//     console.error('Update Profile Error:', error);
//     res.status(500).json({ message: error.message });
//   }
// };


exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (existingUser.status === 'yes') {
      return res.status(403).json({ message: 'You are not eligible to update.' });
    }

    let {
      countryId,
      stateId,
      cityId,
      pincode,
      studentType,
      schoolName,
      instituteName,
      collegeName,
      className
    } = req.body;

    if (pincode && !/^\d+$/.test(pincode)) {
      return res.status(400).json({ message: 'Invalid Pincode' });
    }

    const updatedFields = {
      pincode,
      studentType,
      schoolName,
      instituteName,
      collegeName
    };

    if (mongoose.Types.ObjectId.isValid(countryId)) updatedFields.countryId = countryId;
    if (mongoose.Types.ObjectId.isValid(stateId)) updatedFields.stateId = stateId;
    if (mongoose.Types.ObjectId.isValid(cityId)) updatedFields.cityId = cityId;
    if (mongoose.Types.ObjectId.isValid(className)) updatedFields.className = className;

    if (req.files?.aadharCard?.[0]) {
      updatedFields.aadharCard = req.files.aadharCard[0].path;
    }

    if (req.files?.marksheet?.[0]) {
      updatedFields.marksheet = req.files.marksheet[0].path;
    }

    // === Fetch class updatedBy and admin session ===
    let classDetails = null;
    if (mongoose.Types.ObjectId.isValid(className)) {
      classDetails = await School.findById(className) || await College.findById(className);

      if (classDetails?.updatedBy) {
        let shouldClone = false;

        // 1️⃣ पहली बार updatedBy set हो रहा है
        if (!existingUser.updatedBy) {
          shouldClone = true;
        }

        // 2️⃣ className बदला गया
        if (existingUser.className?.toString() !== className?.toString()) {
          shouldClone = true;
        }

        // 3️⃣ className same है लेकिन updatedBy बदला है
        if (
          existingUser.className?.toString() === className?.toString() &&
          existingUser.updatedBy?.toString() !== classDetails.updatedBy.toString()
        ) {
          shouldClone = true;
        }

        // ✅ अगर condition match होती है तो clone बनाओ
        if (shouldClone) {
          const userData = existingUser.toObject();
          const currentUserId = userData._id;
          delete userData._id;

          if (userData.countryId && typeof userData.countryId === 'object') {
            userData.countryId = userData.countryId._id || userData.countryId;
          }
          if (userData.stateId && typeof userData.stateId === 'object') {
            userData.stateId = userData.stateId._id || userData.stateId;
          }
          if (userData.cityId && typeof userData.cityId === 'object') {
            userData.cityId = userData.cityId._id || userData.cityId;
          }
          if (userData.updatedBy && typeof userData.updatedBy === 'object') {
            userData.updatedBy = userData.updatedBy._id || userData.updatedBy;
          }
          delete userData.__v;

          await UserHistory.create({
            ...userData,
            _id: currentUserId,
            originalUserId: new mongoose.Types.ObjectId(),
            clonedAt: new Date()
          });
        }

        updatedFields.updatedBy = classDetails.updatedBy;

        const admin = await Admin1.findById(classDetails.updatedBy);
        if (admin?.session) {
          updatedFields.session = admin.session;
        }
      }
    }

    // === Update user ===
    const user = await User.findByIdAndUpdate(userId, updatedFields, { new: true })
      .populate('countryId')
      .populate('stateId')
      .populate('cityId')
      .populate('updatedBy', 'email session startDate endDate');

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    if (user.aadharCard && fs.existsSync(user.aadharCard)) {
      user.aadharCard = `${baseUrl}/uploads/${path.basename(user.aadharCard)}`;
    }
    if (user.marksheet && fs.existsSync(user.marksheet)) {
      user.marksheet = `${baseUrl}/uploads/${path.basename(user.marksheet)}`;
    }

    const formattedUser = {
      ...user._doc,
      country: user.countryId?.name || '',
      state: user.stateId?.name || '',
      city: user.cityId?.name || '',
      institutionName: schoolName || collegeName || instituteName || '',
      institutionType: studentType || '',
      classOrYear: classDetails?.name || '',
      session: user.session || '',
      updatedBy: user.updatedBy || null
    };

    return res.status(200).json({
      message: 'Profile updated. Redirecting to home page.',
      user: formattedUser
    });

  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ message: error.message });
  }
};



exports.updateProfileStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByIdAndUpdate(userId, { status: 'yes' }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({ message: 'yes' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.UserSessionDetails = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId)
      .populate('updatedBy', 'email session startDate endDate');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const admin = user.updatedBy;

    if (!admin) {
      return res.status(404).json({ message: 'No session found for that user.' });
    }

    res.status(200).json({
      message: 'User session details fetched successfully.',
      Email: admin.email,
      session: admin.session,
      startDate: admin.startDate,
      endDate: admin.endDate
    });
  } catch (error) {
    console.error('Get User Session Details Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};




// exports.getActiveSessionUsers = async (req, res) => {
//   try {
//     const { startDate, endDate, fields } = req.query;

//     if (!startDate || !endDate) {
//       return res.status(400).json({ message: 'Both startDate and endDate are required in DD-MM-YYYY format.' });
//     }

//     const start = moment(startDate, 'DD-MM-YYYY', true).startOf('day');
//     const end = moment(endDate, 'DD-MM-YYYY', true).endOf('day');

//     if (!start.isValid() || !end.isValid()) {
//       return res.status(400).json({ message: 'Invalid date format. Use DD-MM-YYYY.' });
//     }

//     const baseUrl = `${req.protocol}://${req.get('host')}`;

//     // Fetch users from a collection with source tag
//     async function getUsersFromCollection(Model, source) {
//       const users = await Model.find({
//         startDate: { $exists: true, $ne: '' },
//         endDate: { $exists: true, $ne: '' }
//       })
//         .populate('cityId', 'name')
//         .populate('stateId', 'name')
//         .populate('countryId', 'name')
//         .lean();

//       return users
//         .filter(user => {
//           const userStart = moment(user.startDate, 'DD-MM-YYYY', true).startOf('day');
//           const userEnd = moment(user.endDate, 'DD-MM-YYYY', true).endOf('day');
//           if (!userStart.isValid() || !userEnd.isValid()) return false;
//           return userStart.isSameOrAfter(start) && userEnd.isSameOrBefore(end);
//         })
//         .map(user => ({ ...user, _source: source }));  // Mark source
//     }

//     // Get users from both collections with source marks
//     const [usersFromUser, usersFromUserHistory] = await Promise.all([
//       getUsersFromCollection(User, 'User'),
//       getUsersFromCollection(UserHistory, 'UserHistory')
//     ]);

//     // Combine and remove duplicates by _id (original _id from collection)
//     const combinedMap = new Map();
//     [...usersFromUser, ...usersFromUserHistory].forEach(user => {
//       combinedMap.set(user._id.toString(), user);
//     });
//     const combinedUsers = Array.from(combinedMap.values());

//     // Enrich users with class info, fix file URLs, replace _id if from UserHistory, and filter fields if requested
//     const enrichedUsers = await Promise.all(combinedUsers.map(async (user) => {
//       let classData = null;
//       let classId = user.className;

//       if (mongoose.Types.ObjectId.isValid(classId)) {
//         const school = await School.findById(classId);
//         const college = school ? null : await College.findById(classId);
//         const institution = school || college;

//         if (institution && institution.price != null) {
//           classData = {
//             id: classId,
//             name: institution.name
//           };
//         } else {
//           classId = null;
//         }
//       }

//       const fileFields = ['aadharCard', 'marksheet', 'otherDocument', 'photo'];
//       fileFields.forEach(field => {
//         if (user[field]) {
//           const match = user[field].match(/uploads\/(.+)$/);
//           if (match && match[1]) {
//             user[field] = `${baseUrl}/uploads/${match[1]}`;
//           }
//         }
//       });

//       // Replace _id with originalUserId only if user is from UserHistory
//       let idToUse = user._id.toString();
//       if (user._source === 'UserHistory' && user.originalUserId) {
//         idToUse = user.originalUserId.toString();
//       }

//       const formatted = {
//         ...user,
//         _id: idToUse,
//         className: classData ? classData.id : null,
//         classOrYear: classData ? classData.name : null,
//         country: user.countryId?.name || '',
//         state: user.stateId?.name || '',
//         city: user.cityId?.name || '',
//         platformDetails: idToUse
//       };

//       if (fields) {
//         const requestedFields = fields.split(',');
//         const limited = {};
//         requestedFields.forEach(f => {
//           if (formatted.hasOwnProperty(f)) {
//             limited[f] = formatted[f];
//           }
//         });
//         return limited;
//       }

//       return formatted;
//     }));

//     res.status(200).json({
//       message: 'Filtered users fully inside session range from User and UserHistory.',
//       count: enrichedUsers.length,
//       users: enrichedUsers
//     });

//   } catch (error) {
//     console.error('Error filtering users by session range:', error);
//     res.status(500).json({ message: error.message });
//   }
// };


exports.getActiveSessionUsers = async (req, res) => {
  try {
    const { startDate, endDate, fields } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Both startDate and endDate are required in DD-MM-YYYY format.' });
    }

    const start = moment(startDate, 'DD-MM-YYYY', true).startOf('day');
    const end = moment(endDate, 'DD-MM-YYYY', true).endOf('day');

    if (!start.isValid() || !end.isValid()) {
      return res.status(400).json({ message: 'Invalid date format. Use DD-MM-YYYY.' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    
    async function getUsersFromCollection(Model, source) {
      const users = await Model.find({
        startDate: { $exists: true, $ne: '' },
        endDate: { $exists: true, $ne: '' }
      })
        .populate('cityId', 'name')
        .populate('stateId', 'name')
        .populate('countryId', 'name')
        .lean();

      return users
        .filter(user => {
          const userStart = moment(user.startDate, 'DD-MM-YYYY', true).startOf('day');
          const userEnd = moment(user.endDate, 'DD-MM-YYYY', true).endOf('day');
          if (!userStart.isValid() || !userEnd.isValid()) return false;
          return userStart.isSameOrAfter(start) && userEnd.isSameOrBefore(end);
        })
        .map(user => ({ ...user, _source: source }));  // Mark source
    }

    // Get users from both collections with source marks
    const [usersFromUser, usersFromUserHistory] = await Promise.all([
      getUsersFromCollection(User, 'User'),
      getUsersFromCollection(UserHistory, 'UserHistory')
    ]);

    // Combine and remove duplicates by _id (original _id from collection)
    const combinedMap = new Map();
    [...usersFromUser, ...usersFromUserHistory].forEach(user => {
      combinedMap.set(user._id.toString(), user);
    });
    const combinedUsers = Array.from(combinedMap.values());

    // Enrich users with class info, fix file URLs, replace _id if from UserHistory, and filter fields if requested
    const enrichedUsers = await Promise.all(combinedUsers.map(async (user) => {
      let classData = null;
      let classId = user.className;

      if (mongoose.Types.ObjectId.isValid(classId)) {
        const school = await School.findById(classId);
        const college = school ? null : await College.findById(classId);
        const institution = school || college;

        if (institution && institution.price != null) {
          classData = {
            id: classId,
            name: institution.name
          };
        } else {
          classId = null;
        }
      }

      const fileFields = ['aadharCard', 'marksheet', 'otherDocument', 'photo'];
      fileFields.forEach(field => {
        if (user[field]) {
          const match = user[field].match(/uploads\/(.+)$/);
          if (match && match[1]) {
            user[field] = `${baseUrl}/uploads/${match[1]}`;
          }
        }
      });

      // Replace _id with originalUserId only if user is from UserHistory
      let idToUse = user._id.toString();
      if (user._source === 'UserHistory' && user.originalUserId) {
        idToUse = user.originalUserId.toString();
      }

      // ✅ Compare IST date with endDate, update status in DB if expired
      const currentIST = moment().tz("Asia/Kolkata").startOf('day');
      const userEndDate = moment(user.endDate, 'DD-MM-YYYY', true).startOf('day');

      if (currentIST.isAfter(userEndDate) && user.status !== 'no') {
        await User.updateOne({ _id: user._id }, { $set: { status: 'no' } });
        user.status = 'no'; // reflect in API response
      }

      const formatted = {
        ...user,
        _id: idToUse,
        className: classData ? classData.id : null,
        classOrYear: classData ? classData.name : null,
        country: user.countryId?.name || '',
        state: user.stateId?.name || '',
        city: user.cityId?.name || '',
        platformDetails: idToUse
      };

      if (fields) {
        const requestedFields = fields.split(',');
        const limited = {};
        requestedFields.forEach(f => {
          if (formatted.hasOwnProperty(f)) {
            limited[f] = formatted[f];
          }
        });
        return limited;
      }

      return formatted;
    }));

    res.status(200).json({
      message: 'Filtered users fully inside session range from User and UserHistory.',
      count: enrichedUsers.length,
      users: enrichedUsers
    });

  } catch (error) {
    console.error('Error filtering users by session range:', error);
    res.status(500).json({ message: error.message });
  }
};


exports.getUserHistories = async (req, res) => {
  try {
    const { originalUserId } = req.query; // optional filter

    let filter = {};
    if (originalUserId && mongoose.Types.ObjectId.isValid(originalUserId)) {
      filter.originalUserId = originalUserId;
    }

    let histories = await UserHistory.find(filter)
      .populate('updatedBy', 'email session startDate endDate endTime name role')
      .populate('countryId', 'name')
      .populate('stateId', 'name')
      .populate('cityId', 'name')
      .sort({ clonedAt: -1 })
      .lean();

    // Add computed fields like institutionName, classOrYear for each history
    for (const hist of histories) {
      // Fetch class details from School or College
      let classDetails = null;
      if (hist.className && mongoose.Types.ObjectId.isValid(hist.className)) {
        classDetails = (await School.findById(hist.className).lean()) || (await College.findById(hist.className).lean());
      }

      // institutionName priority: schoolName > collegeName > instituteName (from hist)
      hist.institutionName = hist.schoolName || hist.collegeName || hist.instituteName || '';
      hist.institutionType = hist.studentType || '';

      hist.classOrYear = (classDetails && classDetails.price != null) ? classDetails.name : null;

      // Attach readable country/state/city names
      hist.country = hist.countryId?.name || '';
      hist.state = hist.stateId?.name || '';
      hist.city = hist.cityId?.name || '';

      // Clean up to keep only useful fields (optional)
      delete hist.countryId;
      delete hist.stateId;
      delete hist.cityId;
    }

    res.status(200).json({
      message: 'User histories fetched successfully',
      count: histories.length,
      data: histories
    });

  } catch (error) {
    console.error('Error fetching User Histories:', error);
    res.status(500).json({ message: error.message });
  }
};


exports.getStatesFromUsers = async (req, res) => {
  try {
    const users = await User.find({ stateId: { $ne: null } }).select("stateId");
    if (!users.length) {
      return res.status(200).json({
        message: "No users with stateId found",
        states: []
      });
    }

    const uniqueStateIds = [...new Set(users.map(u => u.stateId.toString()))];

    const states = await Location.find({
      _id: { $in: uniqueStateIds },
      type: "state" 
    }).select("_id name");

    return res.status(200).json({
      message: "User-based states fetched successfully",
      states
    });

  } catch (error) {
    console.error("getStatesFromUsers Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getCitiesFromUsers = async (req, res) => {
  try {
    let { stateId } = req.query; 

    if (!stateId) {
      return res.status(400).json({ message: "stateId(s) are required" });
    }

   
    if (!Array.isArray(stateId)) {
      stateId = stateId.split(","); 
    }

   
    const users = await User.find({ stateId: { $in: stateId } }).select("cityId");

    if (!users.length) {
      return res.status(200).json({ message: "No cities found for these states", cities: [] });
    }

   
    const uniqueCityIds = [...new Set(users.map(u => u.cityId?.toString()).filter(Boolean))];

    
    const cities = await Location.find({
      _id: { $in: uniqueCityIds },
      type: "city"
    }).select("_id name");

    return res.status(200).json({
      message: "User-based cities fetched successfully",
      cities
    });

  } catch (error) {
    console.error("getCitiesFromUsers Error:", error);
    res.status(500).json({ message: error.message });
  }
};


exports.getCategoriesFromUsers = async (req, res) => {
  try {
    let { className, stateId, cityId } = req.query;

   
    let filterQuery = {};
    if (className) filterQuery.className = className;

    if (stateId) {
      if (Array.isArray(stateId)) filterQuery.stateId = { $in: stateId };
      else if (stateId.includes(",")) filterQuery.stateId = { $in: stateId.split(",") };
      else filterQuery.stateId = stateId;
    }

    if (cityId) {
      if (Array.isArray(cityId)) filterQuery.cityId = { $in: cityId };
      else if (cityId.includes(",")) filterQuery.cityId = { $in: cityId.split(",") };
      else filterQuery.cityId = cityId;
    }

    // 2️⃣ Fetch Users
    const users = await User.find(filterQuery).select("_id");

    if (!users.length) {
      return res.status(200).json({ message: "No users found", categories: [] });
    }

    const userIds = users.map((u) => u._id);

    // 3️⃣ Fetch ExamUserStatus for these users
    const examStatuses = await ExamUserStatus.find({ userId: { $in: userIds } })
      .populate({
        path: "examId",
        select: "category",
        populate: { path: "category", select: "_id name" },
      })
      .lean();

    // 4️⃣ Extract unique categories
    const uniqueCategoriesMap = {};
    examStatuses.forEach((ex) => {
      if (ex.examId?.category?._id) {
        uniqueCategoriesMap[ex.examId.category._id] = {
          _id: ex.examId.category._id,
          name: ex.examId.category.name,
        };
      }
    });

    const uniqueCategories = Object.values(uniqueCategoriesMap);

    return res.status(200).json({
      message: "User-based categories fetched successfully",
      categories: uniqueCategories,
    });
  } catch (error) {
    console.error("getCategoriesFromUsers Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


// exports.userforAdmin = async (req, res) => {
//   try {
//     const adminId = req.user._id;
//     let { className, stateId, cityId, categoryId, page = 1, limit = 5, fields } = req.query;

//     page = parseInt(page);
//     limit = parseInt(limit);
//     const skip = (page - 1) * limit;

//     const admin = await Admin1.findById(adminId).select("startDate endDate");
//     if (!admin) return res.status(404).json({ message: "Admin not found." });
//     if (!admin.startDate || !admin.endDate)
//       return res.status(400).json({ message: "Admin session dates missing." });

//     const adminStart = moment(admin.startDate, "DD-MM-YYYY").startOf("day");
//     const adminEnd = moment(admin.endDate, "DD-MM-YYYY").endOf("day");

//     let filterQuery = {};
//     if (className) filterQuery.className = className;

//     if (stateId) {
//       if (Array.isArray(stateId)) filterQuery.stateId = { $in: stateId };
//       else if (stateId.includes(",")) filterQuery.stateId = { $in: stateId.split(",") };
//       else filterQuery.stateId = stateId;
//     }

//     if (cityId) {
//       if (Array.isArray(cityId)) filterQuery.cityId = { $in: cityId };
//       else if (cityId.includes(",")) filterQuery.cityId = { $in: cityId.split(",") };
//       else filterQuery.cityId = cityId;
//     }

//     let users = await User.find(filterQuery)
//       .populate("countryId", "name")
//       .populate("stateId", "name")
//       .populate("cityId", "name")
//       .populate("updatedBy", "email session startDate endDate name role");

//     const baseUrl = `${req.protocol}://${req.get("host")}`.replace("http://", "https://");
//     const defaultExamCount = 3;
//     let finalUsers = [];

//     for (let user of users) {
//       if (!user.startDate || !user.endDate) continue;

//       const userStart = moment(user.startDate, "DD-MM-YYYY").startOf("day");
//       const userEnd = moment(user.endDate, "DD-MM-YYYY").endOf("day");

//       if (!userStart.isSameOrAfter(adminStart) || !userEnd.isSameOrBefore(adminEnd)) continue;

//       let classDetails = null;
//       if (mongoose.Types.ObjectId.isValid(user.className)) {
//         classDetails =
//           (await School.findById(user.className)) || (await College.findById(user.className));
//       }

//       const setFileUrl = (filePath) =>
//         filePath && fs.existsSync(filePath) ? `${baseUrl}/uploads/${path.basename(filePath)}` : "";

//       user.aadharCard = setFileUrl(user.aadharCard);
//       user.marksheet = setFileUrl(user.marksheet);

//       let userExamStatus = await ExamUserStatus.find({ userId: user._id })
//         .populate({
//           path: "examId",
//           select: "title category publish result",
//           populate: { path: "category", select: "_id name" },
//         })
//         .lean();

//       if (categoryId) {
//         const categoryArray = Array.isArray(categoryId) ? categoryId : categoryId.split(",");
//         userExamStatus = userExamStatus.filter(
//           (ex) =>
//             ex.examId?.category?._id &&
//             categoryArray.includes(ex.examId.category._id.toString())
//         );
//       }

//       if (!userExamStatus.length && categoryId) continue;

//       let userCategory = null;
//       if (userExamStatus.length > 0 && userExamStatus[0].examId?.category) {
//         userCategory = {
//           _id: userExamStatus[0].examId.category._id,
//           name: userExamStatus[0].examId.category.name,
//         };
//       }

//       let exams = [];
//       let examIndex = 1;
//       let failedFound = false;

//       for (let ex of userExamStatus) {
//         const categoryName = ex.examId?.category?.name || "";

//         let statesType = "";
//         if (failedFound) statesType = "Not Eligible";
//         else if (!ex.publish) statesType = "To Be Scheduled";
//         else if (ex.publish && (!ex.result || ex.result === "")) statesType = "Scheduled";
//         else if (ex.publish && ["passed", "failed"].includes(ex.result?.toLowerCase()))
//           statesType = "Completed";

//         if (ex.result?.toLowerCase() === "failed") failedFound = true;

//         exams.push({
//           type: `Exam ${examIndex}`,
//           category: categoryName,
//           status: ex.status,
//           publish: ex.publish,
//           attend: ex.attend,
//           visible: ex.visible,
//           isEligible: ex.isEligible,
//           statesType,
//         });

//         exams.push({
//           type: `Exam ${examIndex} Status`,
//           result: ex.result || "",
//           statesType,
//         });

//         examIndex++;
//       }

//       const totalRequired = Math.max(defaultExamCount, userExamStatus.length);
//       while (examIndex <= totalRequired) {
//         exams.push({
//           type: `Exam ${examIndex}`,
//           category: "",
//           status: null,
//           publish: null,
//           attend: null,
//           visible: null,
//           isEligible: null,
//           statesType: null,
//         });

//         exams.push({
//           type: `Exam ${examIndex} Status`,
//           result: null,
//           statesType: null,
//         });

//         examIndex++;
//       }

//       finalUsers.push({
//         ...user._doc,
//         country: user.countryId?.name || "",
//         state: user.stateId?.name || "",
//         city: user.cityId?.name || "",
//         institutionName: user.schoolName || user.collegeName || user.instituteName || "",
//         institutionType: user.studentType || "",
//         classOrYear: classDetails?.name || "",
//         updatedBy: user.updatedBy || null,
//         category: userCategory,
//         exams,
//       });
//     }

//     // -----------------------------
//     // ⭐ ADD FIELDS FILTER HERE ⭐
//     // -----------------------------
//     if (req.query.fields) {
//       const requested = req.query.fields.split(",").map(f => f.trim());

//       finalUsers = finalUsers.map(u => {
//         const newObj = {};
//         requested.forEach(key => {
//           if (u[key] !== undefined) newObj[key] = u[key];
//         });
//         newObj._id = u._id; // always include ID
//         return newObj;
//       });
//     }

//     // ⭐ Pagination on finalUsers
//     const totalUsers = finalUsers.length;
//     const paginatedUsers = finalUsers.slice(skip, skip + limit);

//     return res.status(200).json({
//       message: "Users fetched successfully",
//       page,
//       limit,
//       totalUsers,
//       totalPages: Math.ceil(totalUsers / limit),
//       users: paginatedUsers,
//     });
//   } catch (error) {
//     console.error("userforAdmin Error:", error);
//     res.status(500).json({ message: error.message });
//   }
// };

exports.userforAdmin = async (req, res) => {
  try {
    const adminId = req.user._id;
    let { className, stateId, cityId, categoryId, page = 1, limit = 3, fields } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    const admin = await Admin1.findById(adminId).select("startDate endDate");
    if (!admin) return res.status(404).json({ message: "Admin not found." });
    if (!admin.startDate || !admin.endDate)
      return res.status(400).json({ message: "Admin session dates missing." });

    const adminStart = moment(admin.startDate, "DD-MM-YYYY").startOf("day");
    const adminEnd = moment(admin.endDate, "DD-MM-YYYY").endOf("day");

    let filterQuery = {};
    if (className) filterQuery.className = className;

    if (stateId) {
      if (Array.isArray(stateId)) filterQuery.stateId = { $in: stateId };
      else if (stateId.includes(",")) filterQuery.stateId = { $in: stateId.split(",") };
      else filterQuery.stateId = stateId;
    }

    if (cityId) {
      if (Array.isArray(cityId)) filterQuery.cityId = { $in: cityId };
      else if (cityId.includes(",")) filterQuery.cityId = { $in: cityId.split(",") };
      else filterQuery.cityId = cityId;
    }

    let users = await User.find(filterQuery)
      .populate("countryId", "name")
      .populate("stateId", "name")
      .populate("cityId", "name")
      .populate("updatedBy", "email session startDate endDate name role");

    const baseUrl = `${req.protocol}://${req.get("host")}`.replace("http://", "https://");
    const defaultExamCount = 3;
    let finalUsers = [];

    for (let user of users) {
      if (!user.startDate || !user.endDate) continue;

      const userStart = moment(user.startDate, "DD-MM-YYYY").startOf("day");
      const userEnd = moment(user.endDate, "DD-MM-YYYY").endOf("day");

      if (!userStart.isSameOrAfter(adminStart) || !userEnd.isSameOrBefore(adminEnd)) continue;

      let classDetails = null;
      if (mongoose.Types.ObjectId.isValid(user.className)) {
        classDetails =
          (await School.findById(user.className)) ||
          (await College.findById(user.className));
      }

      const setFileUrl = (filePath) =>
        filePath && fs.existsSync(filePath)
          ? `${baseUrl}/uploads/${path.basename(filePath)}`
          : "";

      user.aadharCard = setFileUrl(user.aadharCard);
      user.marksheet = setFileUrl(user.marksheet);

      let userExamStatus = await ExamUserStatus.find({ userId: user._id })
        .populate({
          path: "examId",
          select: "title category publish result",
          populate: { path: "category", select: "_id name" },
        })
        .lean();

      if (categoryId) {
        const categoryArray = Array.isArray(categoryId)
          ? categoryId
          : categoryId.split(",");
        userExamStatus = userExamStatus.filter(
          (ex) =>
            ex.examId?.category?._id &&
            categoryArray.includes(ex.examId.category._id.toString())
        );
      }

      if (!userExamStatus.length && categoryId) continue;

      let userCategory = null;
      if (userExamStatus.length > 0 && userExamStatus[0].examId?.category) {
        userCategory = {
          _id: userExamStatus[0].examId.category._id,
          name: userExamStatus[0].examId.category.name,
        };
      }

      let exams = [];
      let examIndex = 1;
      let failedFound = false;

      for (let ex of userExamStatus) {
        const categoryName = ex.examId?.category?.name || "";

        let statesType = "";
        if (failedFound) statesType = "Not Eligible";
        else if (!ex.publish) statesType = "To Be Scheduled";
        else if (ex.publish && (!ex.result || ex.result === "")) statesType = "Scheduled";
        else if (ex.publish && ["passed", "failed"].includes(ex.result?.toLowerCase()))
          statesType = "Completed";

        if (ex.result?.toLowerCase() === "failed") failedFound = true;

        exams.push({
          type: `Exam ${examIndex}`,
          category: categoryName,
          status: ex.status,
          publish: ex.publish,
          attend: ex.attend,
          visible: ex.visible,
          isEligible: ex.isEligible,
          statesType,
        });

        exams.push({
          type: `Exam ${examIndex} Status`,
          result: ex.result || "",
          statesType,
        });

        examIndex++;
      }

      const totalRequired = Math.max(defaultExamCount, userExamStatus.length);
      while (examIndex <= totalRequired) {
        exams.push({
          type: `Exam ${examIndex}`,
          category: "",
          status: null,
          publish: null,
          attend: null,
          visible: null,
          isEligible: null,
          statesType: null,
        });

        exams.push({
          type: `Exam ${examIndex} Status`,
          result: null,
          statesType: null,
        });

        examIndex++;
      }

      finalUsers.push({
        ...user._doc,
        country: user.countryId?.name || "",
        state: user.stateId?.name || "",
        city: user.cityId?.name || "",
        institutionName: user.schoolName || user.collegeName || user.instituteName || "",
        institutionType: user.studentType || "",
        classOrYear: classDetails?.name || "",
        updatedBy: user.updatedBy || null,
        category: userCategory,
        exams,
      });
    }

    
    if (fields) {
      const requested = fields.split(",").map(f => f.trim());
      finalUsers = finalUsers.map(u => {
        const obj = { _id: u._id };
        requested.forEach(key => {
          if (u[key] !== undefined) obj[key] = u[key];
        });
        return obj;
      });
    }

    
    const totalUsers = finalUsers.length;
    const paginatedUsers = finalUsers.slice(skip, skip + limit);

    const from = totalUsers === 0 ? 0 : skip + 1;
    const to = Math.min(skip + paginatedUsers.length, totalUsers);

    return res.status(200).json({
      message: "Users fetched successfully",
      page,
      limit,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      from,  
      to,     
      users: paginatedUsers,
    });

  } catch (error) {
    console.error("userforAdmin Error:", error);
    res.status(500).json({ message: error.message });
  }
};


