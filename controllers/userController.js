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
// const Schoolerexam = require('../models/Schoolerexam');
const ExamUserStatus = require("../models/ExamUserStatus");
const Location = require("../models/location");
const CategoryTopUser = require("../models/CategoryTopUser");
const userexamGroup = require("../models/userExamGroup");
const Schoolercategory = require("../models/schoolershipcategory");
const Schoolerexam = require("../models/Schoolerexam");
const UserExamGroup = require("../models/userExamGroup");
const fs = require('fs');
const path = require('path');
// const moment = require('moment');
const moment = require('moment-timezone');


// exports.signup = async (req, res) => {
//   try {
//     const {
//       firstName,
//       middleName,
//       lastName,
//       mobileNumber,
//       email,
//       password,
//       confirmPassword
//     } = req.body;

    
//     if (!firstName) return res.status(400).json({ message: 'First Name can’t remain empty.' });
//     if (!lastName) return res.status(400).json({ message: 'Last Name can’t remain empty.' });
//     if (!mobileNumber) return res.status(400).json({ message: 'Mobile Number can’t remain empty.' });
//     if (!email) return res.status(400).json({ message: 'Email address can’t remain empty.' });
//     if (!password) return res.status(400).json({ message: 'Create Password can’t remain empty.' });
//     if (!confirmPassword) return res.status(400).json({ message: 'Confirm Password can’t remain empty.' });

//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) {
//       return res.status(400).json({ message: 'Please enter a valid email address.' });
//     }

//     const mobileRegex = /^[0-9]{10}$/;
//     if (!mobileRegex.test(mobileNumber)) {
//       return res.status(400).json({ message: 'Mobile Number must be exactly 10 digits and contain only numbers.' });
//     }

//     const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
//     if (!passwordRegex.test(password)) {
//       return res.status(400).json({
//         message: 'Password must contain at least 8 characters with a mix of uppercase, lowercase letters, and numbers.'
//       });
//     }

    
//     if (password !== confirmPassword) {
//       return res.status(400).json({ message: 'Passwords do not match.' });
//     }

 
//     const existingUser = await User.findOne({ $or: [{ email }, { mobileNumber }] });
//     if (existingUser) {
//       return res.status(409).json({ message: 'User with this email or mobile already exists.' });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const newUser = new User({
//       firstName,
//       middleName,
//       lastName,
//       mobileNumber,
//       email,
//       password: hashedPassword,
//     });

//     await newUser.save();

//     const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
//       expiresIn: '7d',
//     });

//     res.status(201).json({
//       message: 'Registered successfully. Redirecting to complete your profile.',
//       token,
//     });

//   } catch (error) {
//     console.error('Signup error:', error);
//     res.status(500).json({ message: 'Server error during signup.', error: error.message });
//   }
// };


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
      return res.status(400).json({ message: 'Mobile Number must be exactly 10 digits.' });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: 'Password must contain at least 8 characters including uppercase, lowercase, and number.'
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

   
    const allCategories = await Schoolercategory.find()
      .select("_id name examType")
      .sort({ createdAt: 1 })
      .lean();

    
    let userDetails = [];
    allCategories.forEach((cat, catIndex) => {
      userDetails.push({
        category: {
          _id: cat._id,
          name: cat.name,
          examType: cat.examType || []
        },
        examTypes: (cat.examType || []).map((et, etIndex) => ({
           _id: et._id, 
          name: et.name,
          status: catIndex === 0 && etIndex === 0 ? "Eligible" : "NA",
          result: "NA",
          AttemptStatus:"NA"
        }))
      });
    });

    const newUser = new User({
      firstName,
      middleName,
      lastName,
      mobileNumber,
      email,
      password: hashedPassword,
      userDetails
    });

    await newUser.save();

    const token = jwt.sign(
      { id: newUser._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registered successfully. Redirecting to complete your profile.',
      token
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      message: 'Server error during signup.',
      error: error.message
    });
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

    // if (req.files?.aadharCard?.[0]) {
    //   updatedFields.aadharCard = req.files.aadharCard[0].path;
    // }
    if (req.files?.marksheet?.[0]) {
      updatedFields.marksheet = req.files.marksheet[0].path;
    }

   
    let user = await User.findByIdAndUpdate(userId, updatedFields, { new: true })
      .populate('countryId')
      .populate('stateId')
      .populate('cityId');

    
    let classDetails = null;
    if (mongoose.Types.ObjectId.isValid(className)) {
      classDetails =
        (await School.findById(className)) ||
        (await College.findById(className)) ;
        // (await Institute.findById(className));
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    // if (user.aadharCard && fs.existsSync(user.aadharCard)) {
    //   user.aadharCard = `${baseUrl}/uploads/${path.basename(user.aadharCard)}`;
    // }
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

//     // 1) लाओ user (populate कुछ फील्ड्स के साथ)
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

//     // 2) className से classDetails ढूंढो (School या College)
//     let classId = user.className;
//     let classDetails = null;

//     if (mongoose.Types.ObjectId.isValid(classId)) {
//       classDetails =
//         (await School.findById(classId)) ||
//         (await College.findById(classId));
//     }

//     // 3) file URLs (aadharCard / marksheet) को public URL बनाना (अगर local path है तो)
//     // const baseUrl = `${req.protocol}://${req.get('host')}`;
// const baseUrl = `${req.protocol}://${req.get('host')}`.replace('http://', 'https://');
//     if (user.aadharCard && fs.existsSync(user.aadharCard)) {
//       user.aadharCard = `${baseUrl}/uploads/${path.basename(user.aadharCard)}`;
//     }
//     if (user.marksheet && fs.existsSync(user.marksheet)) {
//       user.marksheet = `${baseUrl}/uploads/${path.basename(user.marksheet)}`;
//     }

//     // 4) अगर classDetails invalid हो तो className हटाओ
//     if (!classDetails || classDetails.price == null) {
//       classId = null;
//       await User.findByIdAndUpdate(userId, { className: null });
//       user.className = null;
//     } else {
//       // 5) अगर institution.updatedBy बदल गया है तो सिर्फ updatedBy अपडेट करो (clone logic हटाया गया है)
//       const institutionUpdatedBy = classDetails.updatedBy || null;

//       if (institutionUpdatedBy) {
//         const existingUser = await User.findById(userId).select('updatedBy');

//         if (existingUser.updatedBy?.toString() !== institutionUpdatedBy.toString()) {
//           await User.findByIdAndUpdate(userId, { updatedBy: institutionUpdatedBy });
//           user.updatedBy = institutionUpdatedBy;
//         }
//       }
//     }

//     // 6) Sync session-related fields from updatedBy (if populated object) to user
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

//     // 7) Check session expiry (using moment-timezone)
//     if (user.updatedBy?.endDate) {
//       const rawEndDate = String(user.updatedBy.endDate).trim();
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

//     // 8) Final formatted response
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

//     return res.status(200).json({
//       message: 'User profile fetched successfully.',
//       user: formattedUser
//     });

//   } catch (error) {
//     console.error('Get User Profile Error:', error);
//     return res.status(500).json({ message: error.message });
//   }
// };


exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
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

    
    let classId = user.className;
    let classDetails = null;
    if (mongoose.Types.ObjectId.isValid(classId)) {
      classDetails =
        (await School.findById(classId)) ||
        (await College.findById(classId));
    }

    
    const baseUrl = `${req.protocol}://${req.get('host')}`.replace('http://', 'https://');

    // if (user.aadharCard && fs.existsSync(user.aadharCard)) {
    //   user.aadharCard = `${baseUrl}/uploads/${path.basename(user.aadharCard)}`;
    // }
    if (user.marksheet && fs.existsSync(user.marksheet)) {
      user.marksheet = `${baseUrl}/uploads/${path.basename(user.marksheet)}`;
    }

    
    if (!classDetails || classDetails.price == null) {
      classId = null;
      await User.findByIdAndUpdate(userId, { className: null });
      user.className = null;
    } else {
     
      const institutionUpdatedBy = classDetails.updatedBy || null;
      if (institutionUpdatedBy) {
        const existingUser = await User.findById(userId).select('updatedBy');
        if (existingUser.updatedBy?.toString() !== institutionUpdatedBy.toString()) {
          await User.findByIdAndUpdate(userId, { updatedBy: institutionUpdatedBy });
          user.updatedBy = institutionUpdatedBy;
        }
      }
    }

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

    
    if (user.updatedBy?.endDate) {
      const rawEndDate = String(user.updatedBy.endDate).trim();
      const endDate = moment.tz(rawEndDate, 'DD-MM-YYYY', 'Asia/Kolkata').endOf('day');
      const currentDate = moment.tz('Asia/Kolkata');
      if (endDate.isValid() && currentDate.isSameOrAfter(endDate)) {
        if (user.status !== 'no') {
          await User.findByIdAndUpdate(userId, { status: 'no' });
          user.status = 'no';
        }
      }
    }

   
    const formattedUser = {
      _id: user._id,
      VerifyEmail: user.VerifyEmail,
      firstName: user.firstName,
      middleName: user.middleName,
      lastName: user.lastName,
      mobileNumber: user.mobileNumber,
      email: user.email,
      aadharCard: user.aadharCard || "",
      marksheet: user.marksheet || "",
      pincode: user.pincode || "",
      status: user.status,
      level: user.level,
      session: user.session || "",
      countryId: user.countryId || null,
      stateId: user.stateId || null,
      cityId: user.cityId || null,
      className: classId || null,
       price:
        classDetails && classDetails.price != null
          ? classDetails.price
          : null,
      studentType: user.studentType || "",
      instituteName:
        user.schoolName || user.collegeName || user.instituteName || "",
      classOrYear:
        classDetails && classDetails.price != null ? classDetails.name : "",
        startDate: user.startDate || "",      
     endDate: user.endDate || ""  
    };

    return res.status(200).json({
      message: "User profile fetched successfully.",
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

    
//     let classDetails = null;
//     if (mongoose.Types.ObjectId.isValid(className)) {
//       classDetails = await School.findById(className) || await College.findById(className);

//       if (classDetails?.updatedBy) {
//         let shouldClone = false;

      
//         if (!existingUser.updatedBy) {
//           shouldClone = true;
//         }

       
//         if (existingUser.className?.toString() !== className?.toString()) {
//           shouldClone = true;
//         }

       
//         if (
//           existingUser.className?.toString() === className?.toString() &&
//           existingUser.updatedBy?.toString() !== classDetails.updatedBy.toString()
//         ) {
//           shouldClone = true;
//         }

        
//         if (shouldClone) {
//           const userData = existingUser.toObject();
//           const currentUserId = userData._id;
//           delete userData._id;

//           if (userData.countryId && typeof userData.countryId === 'object') {
//             userData.countryId = userData.countryId._id || userData.countryId;
//           }
//           if (userData.stateId && typeof userData.stateId === 'object') {
//             userData.stateId = userData.stateId._id || userData.stateId;
//           }
//           if (userData.cityId && typeof userData.cityId === 'object') {
//             userData.cityId = userData.cityId._id || userData.cityId;
//           }
//           if (userData.updatedBy && typeof userData.updatedBy === 'object') {
//             userData.updatedBy = userData.updatedBy._id || userData.updatedBy;
//           }
//           delete userData.__v;

//           await UserHistory.create({
//             ...userData,
//             _id: currentUserId,
//             originalUserId: new mongoose.Types.ObjectId(),
//             clonedAt: new Date()
//           });
//         }

//         updatedFields.updatedBy = classDetails.updatedBy;

//         const admin = await Admin1.findById(classDetails.updatedBy);
//         if (admin?.session) {
//           updatedFields.session = admin.session;
//         }
//       }
//     }
 
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

    let classDetails = null;
    if (mongoose.Types.ObjectId.isValid(className)) {
      classDetails =
        (await School.findById(className)) ||
        (await College.findById(className));

      if (classDetails?.updatedBy) {
        let shouldClone = false;

        if (!existingUser.updatedBy) {
          shouldClone = true;
        }

        if (existingUser.className?.toString() !== className?.toString()) {
          shouldClone = true;
        }

        if (
          existingUser.className?.toString() === className?.toString() &&
          existingUser.updatedBy?.toString() !== classDetails.updatedBy.toString()
        ) {
          shouldClone = true;
        }

       
        if (shouldClone) {
          const alreadyExists = await UserHistory.findOne({
            originalUserId: existingUser._id,
            className: className,
            updatedBy: classDetails.updatedBy
          });

         
          if (!alreadyExists) {
            const userData = existingUser.toObject();

            delete userData._id;
            delete userData.__v;

            if (userData.countryId?._id) userData.countryId = userData.countryId._id;
            if (userData.stateId?._id) userData.stateId = userData.stateId._id;
            if (userData.cityId?._id) userData.cityId = userData.cityId._id;
            if (userData.updatedBy?._id) userData.updatedBy = userData.updatedBy._id;
            if (userData.className?._id) userData.className = userData.className._id;

            await UserHistory.create({
              ...userData,
              originalUserId: existingUser._id,
              clonedAt: new Date()
            });
          }
        }
     

        updatedFields.updatedBy = classDetails.updatedBy;

        const admin = await Admin1.findById(classDetails.updatedBy);
        if (admin?.session) {
          updatedFields.session = admin.session;
        }
      }
    }

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
    return res.status(500).json({ message: error.message });
  }
};


exports.updateProfileStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByIdAndUpdate(
      userId,
      {
        status: 'yes',
        updatedAt: new Date() 
      },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

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

exports.getActiveSessionUsers = async (req, res) => {
  try {
    const { startDate, endDate, fields } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: 'Both startDate and endDate are required in DD-MM-YYYY format.'
      });
    }

    const filterStart = moment(startDate, 'DD-MM-YYYY', true).startOf('day');
    const filterEnd   = moment(endDate, 'DD-MM-YYYY', true).endOf('day');

    if (!filterStart.isValid() || !filterEnd.isValid()) {
      return res.status(400).json({
        message: 'Invalid date format. Use DD-MM-YYYY.'
      });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const today = moment().tz('Asia/Kolkata').startOf('day');

    const users = await User.find({
      startDate: { $exists: true, $ne: '' },
      endDate: { $exists: true, $ne: '' }
    })
      .populate('cityId', 'name')
      .populate('stateId', 'name')
      .populate('countryId', 'name')
      .lean();

    const finalUsers = [];

    for (const user of users) {

      if (!user.updatedBy || !mongoose.Types.ObjectId.isValid(user.updatedBy)) {
        continue;
      }

      /** 1️⃣ ADMIN FETCH */
      const admin = await Admin1.findById(user.updatedBy)
        .select('startDate endDate status')
        .lean();

      if (!admin || !admin.startDate || !admin.endDate) continue;

      const adminStart = moment(admin.startDate, 'DD-MM-YYYY', true).startOf('day');
      const adminEnd   = moment(admin.endDate, 'DD-MM-YYYY', true).endOf('day');

      if (!adminStart.isValid() || !adminEnd.isValid()) continue;

      /** 2️⃣ FILTER (ADMIN DATE RANGE) */
      if (
        adminStart.isBefore(filterStart) ||
        adminEnd.isAfter(filterEnd)
      ) {
        continue;
      }

      const userStart = moment(user.startDate, 'DD-MM-YYYY', true);
      const userEnd   = moment(user.endDate, 'DD-MM-YYYY', true);

      /** 3️⃣ ADMIN → USER DATE SYNC */
      if (
        !userStart.isSame(adminStart, 'day') ||
        !userEnd.isSame(adminEnd, 'day')
      ) {
        await User.updateOne(
          { _id: user._id },
          {
            $set: {
              startDate: admin.startDate,
              endDate: admin.endDate,
              status: 'yes'
            }
          }
        );

        user.startDate = admin.startDate;
        user.endDate = admin.endDate;
        user.status = 'yes';
      }

      /** 4️⃣ STATUS EXPIRE CHECK (ADMIN DATE ONLY) */
      if (today.isAfter(adminEnd)) {

        if (user.status !== 'no') {
          await User.updateOne(
            { _id: user._id },
            { $set: { status: 'no' } }
          );
          user.status = 'no';
        }

        if (admin.status === true) {
          await Admin1.updateOne(
            { _id: admin._id },
            { $set: { status: false } }
          );
        }
      }

      /** 5️⃣ FILE URL FORMAT */
      const fileFields = ['aadharCard', 'marksheet', 'otherDocument', 'photo'];
      fileFields.forEach(field => {
        if (user[field]) {
          const match = user[field].match(/uploads\/(.+)$/);
          if (match && match[1]) {
            user[field] = `${baseUrl}/uploads/${match[1]}`;
          }
        }
      });

      /** 6️⃣ RESPONSE OBJECT */
      const formattedUser = {
        ...user,
        country: user.countryId?.name || '',
        state: user.stateId?.name || '',
        city: user.cityId?.name || '',
        adminStatus: admin.status,
        platformDetails: user._id
      };

      /** 7️⃣ FIELDS FILTER */
      if (fields) {
        const requestedFields = fields.split(',');
        const limited = {};
        requestedFields.forEach(f => {
          if (formattedUser.hasOwnProperty(f)) {
            limited[f] = formattedUser[f];
          }
        });
        finalUsers.push(limited);
      } else {
        finalUsers.push(formattedUser);
      }
    }

    return res.status(200).json({
      message: 'Filtered users synced with admin dates and status verified.',
      count: finalUsers.length,
      users: finalUsers
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ message: error.message });
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
//         .map(user => ({ ...user, _source: source }));  
//     }


//     const [usersFromUser, usersFromUserHistory] = await Promise.all([
//       getUsersFromCollection(User, 'User'),
//       getUsersFromCollection(UserHistory, 'UserHistory')
//     ]);

    
//     const combinedMap = new Map();
//     [...usersFromUser, ...usersFromUserHistory].forEach(user => {
//       combinedMap.set(user._id.toString(), user);
//     });
//     const combinedUsers = Array.from(combinedMap.values());

    
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

     
//       let idToUse = user._id.toString();
//       if (user._source === 'UserHistory' && user.originalUserId) {
//         idToUse = user.originalUserId.toString();
//       }

     
//       const currentIST = moment().tz("Asia/Kolkata").startOf('day');
//       const userEndDate = moment(user.endDate, 'DD-MM-YYYY', true).startOf('day');

//       if (currentIST.isAfter(userEndDate) && user.status !== 'no') {
//         await User.updateOne({ _id: user._id }, { $set: { status: 'no' } });
//         user.status = 'no'; 
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


exports.getUserHistories = async (req, res) => {
  try {
    const { originalUserId } = req.query; 

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
//     let {
//       className,
//       stateId,
//       cityId,
//       categoryId,
//       schoolershipstatus,
//       status,
//       page = 1,
//       limit = 10,
//       fields
//     } = req.query;

//     page = parseInt(page);
//     limit = parseInt(limit);
//     const skip = (page - 1) * limit;

//     const admin = await Admin1.findById(adminId).select("startDate endDate");
//     if (!admin) {
//       return res.status(404).json({ message: "Admin not found." });
//     }

//     const adminStart = moment(admin.startDate, "DD-MM-YYYY").startOf("day");
//     const adminEnd = moment(admin.endDate, "DD-MM-YYYY").endOf("day");

//     let filterQuery = {};
//     if (className) filterQuery.className = className;

//     if (stateId) {
//       filterQuery.stateId = stateId.includes(",")
//         ? { $in: stateId.split(",") }
//         : stateId;
//     }

//     if (cityId) {
//       filterQuery.cityId = cityId.includes(",")
//         ? { $in: cityId.split(",") }
//         : cityId;
//     }

//     const users = await User.find(filterQuery)
//       .populate("countryId", "name")
//       .populate("stateId", "name")
//       .populate("cityId", "name")
//       .populate("updatedBy", "email name role");

//     const userIds = users.map(u => u._id);

//     const groups = await userexamGroup.find({
//       members: { $in: userIds }
//     })
//       .sort({ createdAt: -1 })
//       .populate("category", "_id name")
//       .lean();

//     const userGroupCategoryMap = {};
//     groups.forEach(g => {
//       g.members.forEach(uid => {
//         if (!userGroupCategoryMap[uid] && g.category) {
//           userGroupCategoryMap[uid] = g.category;
//         }
//       });
//     });

//     const defaultCategory = await Schoolercategory.findOne()
//       .select("_id name")
//       .sort({ createdAt: 1 })
//       .lean();

//     const examStatuses = await ExamUserStatus.find({
//       userId: { $in: userIds }
//     })
//       .select("userId category result attemptStatus")
//       .lean();

//     const failedMap = {};
//     examStatuses.forEach(es => {
//       if (es.result === "failed" && es.category?._id) {
//         const key = `${es.userId}_${es.category._id}`;
//         failedMap[key] = true;
//       }
//     });

//     const categoryTopUsers = await CategoryTopUser.find({
//       userId: { $in: userIds }
//     })
//       .select("userId schoolerStatus")
//       .lean();

//     const finalistMap = {};
//     categoryTopUsers.forEach(ctu => {
//       const key = `${ctu.userId}_${ctu.schoolerStatus}`;
//       finalistMap[key] = true;
//     });

//     let finalUsers = [];

//     for (let user of users) {
//       if (user.startDate && user.endDate) {
//         const uStart = moment(user.startDate, "DD-MM-YYYY").startOf("day");
//         const uEnd = moment(user.endDate, "DD-MM-YYYY").endOf("day");
//         if (!uStart.isSameOrAfter(adminStart) || !uEnd.isSameOrBefore(adminEnd)) {
//           continue;
//         }
//       }

//       let category = { _id: null, name: "NA" };
//       let computedSchoolershipstatus = "NA";

//       if (user.status === "yes") {
//         computedSchoolershipstatus = "Participant";

//         category =
//           userGroupCategoryMap[user._id] ||
//           defaultCategory ||
//           { _id: null, name: "NA" };

//         if (category?._id) {
//           const key = `${user._id}_${category._id}`;

//           if (failedMap[key]) {
//             computedSchoolershipstatus = "Eliminated";
//           }

//           const notAttempted = examStatuses.find(
//             es =>
//               es.userId.toString() === user._id.toString() &&
//               es.category?._id.toString() === category._id.toString() &&
//               es.attemptStatus === "Not Attempted"
//           );

//           if (notAttempted) {
//             computedSchoolershipstatus = "Eliminated";
//           }

//           if (finalistMap[key]) {
//             computedSchoolershipstatus = "Finalist";
//           }
//         }
//       }
  
//       await User.updateOne(
//         { _id: user._id },
//         {
//           $set: {
//             schoolershipstatus: computedSchoolershipstatus,
//             category
//           }
//         }
//       );

//       finalUsers.push({
//         ...user._doc,
//         country: user.countryId?.name || "",
//         state: user.stateId?.name || "",
//         city: user.cityId?.name || "",
//         institutionName:
//           user.schoolName || user.collegeName || user.instituteName || "",
//         institutionType: user.studentType || "",
//         category,
//         schoolershipstatus: computedSchoolershipstatus
//       });
//     }

//     if (categoryId) {
//       const categoriesArray = categoryId.split(",");
//       finalUsers = finalUsers.filter(u =>
//         u.category?._id && categoriesArray.includes(u.category._id.toString())
//       );
//     }

//     if (schoolershipstatus) {
//       const statusArray = schoolershipstatus.split(",").map(s => s.trim());
//       finalUsers = finalUsers.filter(u =>
//         statusArray.includes(u.schoolershipstatus)
//       );
//     }

//     if (status) {
//       const statusArray = status.split(",").map(s => s.trim().toLowerCase());
//       finalUsers = finalUsers.filter(
//         u => u.status && statusArray.includes(u.status.toLowerCase())
//       );
//     }

//     if (fields) {
//       const reqFields = fields.split(",").map(f => f.trim());
//       finalUsers = finalUsers.map(u => {
//         const obj = { _id: u._id };
//         reqFields.forEach(f => {
//           if (u[f] !== undefined) obj[f] = u[f];
//         });
//         return obj;
//       });
//     }

//     const totalUsers = finalUsers.length;
//     const paginated = finalUsers.slice(skip, skip + limit);

//     const from = totalUsers === 0 ? 0 : skip + 1;
//     const to = Math.min(skip + paginated.length, totalUsers);

//     return res.status(200).json({
//       message: "Users fetched successfully",
//       page,
//       limit,
//       totalUsers,
//       totalPages: Math.ceil(totalUsers / limit),
//       from,
//       to,
//       users: paginated
//     });

//   } catch (error) {
//     console.error("userforAdmin Error:", error);
//     return res.status(500).json({ message: error.message });
//   }
// };

exports.userforAdmin = async (req, res) => {
  try {
    const adminId = req.user._id;
    let {
      className,
      stateId,
      cityId,
      categoryId,
      schoolershipstatus,
      status,
      page = 1,
      limit = 10,
      fields
    } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);
    const skip = (page - 1) * limit;

    const admin = await Admin1.findById(adminId).select("startDate endDate");
    if (!admin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    const adminStart = moment(admin.startDate, "DD-MM-YYYY").startOf("day");
    const adminEnd = moment(admin.endDate, "DD-MM-YYYY").endOf("day");

    let filterQuery = {};
    if (className) filterQuery.className = className;

    if (stateId) {
      filterQuery.stateId = stateId.includes(",")
        ? { $in: stateId.split(",") }
        : stateId;
    }

    if (cityId) {
      filterQuery.cityId = cityId.includes(",")
        ? { $in: cityId.split(",") }
        : cityId;
    }

    const users = await User.find(filterQuery)
      .populate("countryId", "name")
      .populate("stateId", "name")
      .populate("cityId", "name")
      .populate("updatedBy", "email name role");

    const userIds = users.map(u => u._id);

    const groups = await userexamGroup.find({
      members: { $in: userIds }
    })
      .sort({ createdAt: -1 })
      .populate("category", "_id name")
      .lean();

    const userGroupCategoryMap = {};
    groups.forEach(g => {
      g.members.forEach(uid => {
        if (!userGroupCategoryMap[uid] && g.category) {
          userGroupCategoryMap[uid] = g.category;
        }
      });
    });

    const defaultCategory = await Schoolercategory.findOne()
      .select("_id name")
      .sort({ createdAt: 1 })
      .lean();

    const examStatuses = await ExamUserStatus.find({
      userId: { $in: userIds }
    })
      .select("userId category result attemptStatus")
      .lean();

    const failedMap = {};
    examStatuses.forEach(es => {
      if (es.result === "failed" && es.category?._id) {
        const key = `${es.userId}_${es.category._id}`;
        failedMap[key] = true;
      }
    });

    const categoryTopUsers = await CategoryTopUser.find({
      userId: { $in: userIds }
    })
      .select("userId schoolerStatus")
      .lean();

    const finalistMap = {};
    categoryTopUsers.forEach(ctu => {
      const key = `${ctu.userId}_${ctu.schoolerStatus}`;
      finalistMap[key] = true;
    });

    let finalUsers = [];

    for (let user of users) {

      /* ===== ONLY ADDITION START (classOrYear) ===== */
      let classDetails = null;
      let classOrYear = "";

      if (user.className && mongoose.Types.ObjectId.isValid(user.className)) {
        classDetails =
          (await School.findById(user.className).select("name price")) ||
          (await College.findById(user.className).select("name price"));

        if (classDetails && classDetails.price != null) {
          classOrYear = classDetails.name;
        }
      }
      /* ===== ONLY ADDITION END ===== */

      if (user.startDate && user.endDate) {
        const uStart = moment(user.startDate, "DD-MM-YYYY").startOf("day");
        const uEnd = moment(user.endDate, "DD-MM-YYYY").endOf("day");
        if (!uStart.isSameOrAfter(adminStart) || !uEnd.isSameOrBefore(adminEnd)) {
          continue;
        }
      }

      let category = { _id: null, name: "NA" };
      let computedSchoolershipstatus = "NA";

      if (user.status === "yes") {
        computedSchoolershipstatus = "Participant";

        category =
          userGroupCategoryMap[user._id] ||
          defaultCategory ||
          { _id: null, name: "NA" };

        if (category?._id) {
          const key = `${user._id}_${category._id}`;

          if (failedMap[key]) {
            computedSchoolershipstatus = "Eliminated";
          }

          const notAttempted = examStatuses.find(
            es =>
              es.userId.toString() === user._id.toString() &&
              es.category?._id.toString() === category._id.toString() &&
              es.attemptStatus === "Not Attempted"
          );

          if (notAttempted) {
            computedSchoolershipstatus = "Eliminated";
          }

          if (finalistMap[key]) {
            computedSchoolershipstatus = "Finalist";
          }
        }
      }

      if (user.userDetails && user.userDetails.length > 0) {
        user.userDetails.forEach((ud) => {
          if (
            ud.category?._id?.toString() === category._id?.toString() &&
            ud.examTypes?.length > 0
          ) {
            ud.examTypes[0].status = "Eligible";
          }
        });
      }

      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            schoolershipstatus: computedSchoolershipstatus,
            category,
            userDetails: user.userDetails
          }
        }
      );

      finalUsers.push({
        ...user._doc,
        country: user.countryId?.name || "",
        state: user.stateId?.name || "",
        city: user.cityId?.name || "",
        institutionName:
          user.schoolName || user.collegeName || user.instituteName || "",
        institutionType: user.studentType || "",
        classOrYear, // ✅ ADDED
        category,
        schoolershipstatus: computedSchoolershipstatus
      });
    }

    if (categoryId) {
      const categoriesArray = categoryId.split(",");
      finalUsers = finalUsers.filter(u =>
        u.category?._id && categoriesArray.includes(u.category._id.toString())
      );
    }

    if (schoolershipstatus) {
      const statusArray = schoolershipstatus.split(",").map(s => s.trim());
      finalUsers = finalUsers.filter(u =>
        statusArray.includes(u.schoolershipstatus)
      );
    }

    if (status) {
      const statusArray = status.split(",").map(s => s.trim().toLowerCase());
      finalUsers = finalUsers.filter(
        u => u.status && statusArray.includes(u.status.toLowerCase())
      );
    }

    if (fields) {
      const reqFields = fields.split(",").map(f => f.trim());
      finalUsers = finalUsers.map(u => {
        const obj = { _id: u._id };
        reqFields.forEach(f => {
          if (u[f] !== undefined) obj[f] = u[f];
        });
        return obj;
      });
    }

    const totalUsers = finalUsers.length;
    const paginated = finalUsers.slice(skip, skip + limit);

    const from = totalUsers === 0 ? 0 : skip + 1;
    const to = Math.min(skip + paginated.length, totalUsers);

    return res.status(200).json({
      message: "Users fetched successfully",
      page,
      limit,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limit),
      from,
      to,
      users: paginated
    });

  } catch (error) {
    console.error("userforAdmin Error:", error);
    return res.status(500).json({ message: error.message });
  }
};


// exports.userforAdmin = async (req, res) => {
//   try {
//     const adminId = req.user._id;
//     let {
//       className,
//       stateId,
//       cityId,
//       categoryId,
//       schoolershipstatus,
//       status,
//       page = 1,
//       limit = 10,
//       fields
//     } = req.query;

//     page = parseInt(page);
//     limit = parseInt(limit);
//     const skip = (page - 1) * limit;

//     const admin = await Admin1.findById(adminId).select("startDate endDate");
//     if (!admin) {
//       return res.status(404).json({ message: "Admin not found." });
//     }

//     const adminStart = moment(admin.startDate, "DD-MM-YYYY").startOf("day");
//     const adminEnd = moment(admin.endDate, "DD-MM-YYYY").endOf("day");

//     let filterQuery = {};
//     if (className) filterQuery.className = className;

//     if (stateId) {
//       filterQuery.stateId = stateId.includes(",")
//         ? { $in: stateId.split(",") }
//         : stateId;
//     }

//     if (cityId) {
//       filterQuery.cityId = cityId.includes(",")
//         ? { $in: cityId.split(",") }
//         : cityId;
//     }

//     const users = await User.find(filterQuery)
//       .populate("countryId", "name")
//       .populate("stateId", "name")
//       .populate("cityId", "name")
//       .populate("updatedBy", "email name role");

//     const userIds = users.map(u => u._id);

//     const groups = await userexamGroup.find({
//       members: { $in: userIds }
//     })
//       .sort({ createdAt: -1 })
//       .populate("category", "_id name")
//       .lean();

//     const userGroupCategoryMap = {};
//     groups.forEach(g => {
//       g.members.forEach(uid => {
//         if (!userGroupCategoryMap[uid] && g.category) {
//           userGroupCategoryMap[uid] = g.category;
//         }
//       });
//     });

//     const defaultCategory = await Schoolercategory.findOne()
//       .select("_id name")
//       .sort({ createdAt: 1 })
//       .lean();

//     const examStatuses = await ExamUserStatus.find({
//       userId: { $in: userIds }
//     })
//       .select("userId category result attemptStatus")
//       .lean();

//     const failedMap = {};
//     examStatuses.forEach(es => {
//       if (es.result === "failed" && es.category?._id) {
//         const key = `${es.userId}_${es.category._id}`;
//         failedMap[key] = true;
//       }
//     });

//     const categoryTopUsers = await CategoryTopUser.find({
//       userId: { $in: userIds }
//     })
//       .select("userId schoolerStatus")
//       .lean();

//     const finalistMap = {};
//     categoryTopUsers.forEach(ctu => {
//       const key = `${ctu.userId}_${ctu.schoolerStatus}`;
//       finalistMap[key] = true;
//     });

//     let finalUsers = [];

//     for (let user of users) {
//       if (user.startDate && user.endDate) {
//         const uStart = moment(user.startDate, "DD-MM-YYYY").startOf("day");
//         const uEnd = moment(user.endDate, "DD-MM-YYYY").endOf("day");
//         if (!uStart.isSameOrAfter(adminStart) || !uEnd.isSameOrBefore(adminEnd)) {
//           continue;
//         }
//       }

//       let category = { _id: null, name: "NA" };
//       let computedSchoolershipstatus = "NA";

//       if (user.status === "yes") {
//         computedSchoolershipstatus = "Participant";

//         category =
//           userGroupCategoryMap[user._id] ||
//           defaultCategory ||
//           { _id: null, name: "NA" };

//         if (category?._id) {
//           const key = `${user._id}_${category._id}`;

//           if (failedMap[key]) {
//             computedSchoolershipstatus = "Eliminated";
//           }

//           const notAttempted = examStatuses.find(
//             es =>
//               es.userId.toString() === user._id.toString() &&
//               es.category?._id.toString() === category._id.toString() &&
//               es.attemptStatus === "Not Attempted"
//           );

//           if (notAttempted) {
//             computedSchoolershipstatus = "Eliminated";
//           }

//           if (finalistMap[key]) {
//             computedSchoolershipstatus = "Finalist";
//           }
//         }
//       }


//       if (user.userDetails && user.userDetails.length > 0) {
//         user.userDetails.forEach((ud) => {
//           if (ud.category._id?.toString() === category._id?.toString() && ud.examTypes?.length > 0) {
//             ud.examTypes[0].status = "Eligible"; 
//           }
//         });
//       }
      

//       await User.updateOne(
//         { _id: user._id },
//         {
//           $set: {
//             schoolershipstatus: computedSchoolershipstatus,
//             category,
//             userDetails: user.userDetails
//           }
//         }
//       );

//       finalUsers.push({
//         ...user._doc,
//         country: user.countryId?.name || "",
//         state: user.stateId?.name || "",
//         city: user.cityId?.name || "",
//         institutionName:
//           user.schoolName || user.collegeName || user.instituteName || "",
//         institutionType: user.studentType || "",
//         category,
//         schoolershipstatus: computedSchoolershipstatus
//       });
//     }

//     if (categoryId) {
//       const categoriesArray = categoryId.split(",");
//       finalUsers = finalUsers.filter(u =>
//         u.category?._id && categoriesArray.includes(u.category._id.toString())
//       );
//     }

//     if (schoolershipstatus) {
//       const statusArray = schoolershipstatus.split(",").map(s => s.trim());
//       finalUsers = finalUsers.filter(u =>
//         statusArray.includes(u.schoolershipstatus)
//       );
//     }

//     if (status) {
//       const statusArray = status.split(",").map(s => s.trim().toLowerCase());
//       finalUsers = finalUsers.filter(
//         u => u.status && statusArray.includes(u.status.toLowerCase())
//       );
//     }

//     if (fields) {
//       const reqFields = fields.split(",").map(f => f.trim());
//       finalUsers = finalUsers.map(u => {
//         const obj = { _id: u._id };
//         reqFields.forEach(f => {
//           if (u[f] !== undefined) obj[f] = u[f];
//         });
//         return obj;
//       });
//     }

//     const totalUsers = finalUsers.length;
//     const paginated = finalUsers.slice(skip, skip + limit);

//     const from = totalUsers === 0 ? 0 : skip + 1;
//     const to = Math.min(skip + paginated.length, totalUsers);

//     return res.status(200).json({
//       message: "Users fetched successfully",
//       page,
//       limit,
//       totalUsers,
//       totalPages: Math.ceil(totalUsers / limit),
//       from,
//       to,
//       users: paginated
//     });

//   } catch (error) {
//     console.error("userforAdmin Error:", error);
//     return res.status(500).json({ message: error.message });
//   }
// };


exports.getAvailableSchoolershipStatus = async (req, res) => {
  try {
    const adminId = req.user._id;

    const admin = await Admin1.findById(adminId).select("startDate endDate");
    if (!admin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    const adminStart = moment(admin.startDate, "DD-MM-YYYY").startOf("day");
    const adminEnd = moment(admin.endDate, "DD-MM-YYYY").endOf("day");

    const users = await User.find({});
    const userIds = users.map(u => u._id);

    const groups = await userexamGroup.find({
      members: { $in: userIds }
    }).populate("category", "_id name").lean();

    const userGroupCategoryMap = {};
    groups.forEach(g => {
      g.members.forEach(uid => {
        if (!userGroupCategoryMap[uid] && g.category) {
          userGroupCategoryMap[uid] = g.category;
        }
      });
    });

    const defaultCategory = await Schoolercategory.findOne()
      .select("_id name")
      .sort({ createdAt: 1 })
      .lean();

    const examStatuses = await ExamUserStatus.find({
      userId: { $in: userIds }
    }).select("userId category result attemptStatus").lean();

    const failedMap = {};
    examStatuses.forEach(es => {
      if (es.result === "failed" && es.category?._id) {
        failedMap[`${es.userId}_${es.category._id}`] = true;
      }
    });

    const categoryTopUsers = await CategoryTopUser.find({
      userId: { $in: userIds }
    }).select("userId schoolerStatus").lean();

    const finalistMap = {};
    categoryTopUsers.forEach(ctu => {
      finalistMap[`${ctu.userId}_${ctu.schoolerStatus}`] = true;
    });

    const statusSet = new Set();

    for (let user of users) {

      if (user.startDate && user.endDate) {
        const uStart = moment(user.startDate, "DD-MM-YYYY").startOf("day");
        const uEnd = moment(user.endDate, "DD-MM-YYYY").endOf("day");
        if (!uStart.isSameOrAfter(adminStart) || !uEnd.isSameOrBefore(adminEnd)) {
          continue;
        }
      }

      let status = "NA";
      const category = userGroupCategoryMap[user._id] || defaultCategory;

      if (user.status === "yes") {
        status = "Participant";

        if (category?._id) {
          const key = `${user._id}_${category._id}`;

          if (failedMap[key]) status = "Eliminated";

          const notAttempted = examStatuses.find(
            es =>
              es.userId.toString() === user._id.toString() &&
              es.category?._id.toString() === category._id.toString() &&
              es.attemptStatus === "Not Attempted"
          );
          if (notAttempted) status = "Eliminated";

          if (finalistMap[key]) status = "Finalist";
        }
      }

      statusSet.add(status);
    }

    return res.status(200).json({
      success: true,
      data: Array.from(statusSet)
    });

  } catch (error) {
    console.error("getAvailableSchoolershipStatus Error:", error);
    return res.status(500).json({ message: error.message });
  }
};



exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Valid userId is required",
      });
    }

    const user = await User.findById(userId)
      .select("firstName status schoolershipstatus category userDetails")
      .populate("category._id", "name");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

   
    const examIds = [];
    user.userDetails.forEach((ud) => {
      ud.examTypes.forEach((et) => {
        if (et.exam) examIds.push(et.exam.toString());
      });
    });

    
    const examStatusMap = {};
    if (examIds.length) {
      const examStatuses = await ExamUserStatus.find({
        userId,
        examId: { $in: examIds },
      }).lean();

      examStatuses.forEach((es) => {
        examStatusMap[es.examId.toString()] = {
          AttemptStatus: es.attemptStatus ?? "NA",
          result: es.result ?? "NA",
        };
      });
    }

   
    const examNameMap = {};
    if (examIds.length) {
      const exams = await Schoolerexam.find({ _id: { $in: examIds } })
        .select("_id examName")
        .lean();

      exams.forEach((ex) => {
        examNameMap[ex._id.toString()] = ex.examName;
      });
    }

   
    user.userDetails.forEach((ud) => {
      let allowNext = true;
      let nextStatusNA = false;
      ud.examTypes.forEach((et, index) => {
        if (!et.exam) return;

        const statusData = examStatusMap[et.exam.toString()] || {
          AttemptStatus: "NA",
          result: "NA",
        };

        const attemptStatus = statusData.AttemptStatus;
        const result = statusData.result;

        et.AttemptStatus = attemptStatus;
        et.result = result;

        if (index === 0) {
       
          if (attemptStatus === "Attempted" && ["PASS", "PASSED"].includes(result?.toUpperCase())) {
            allowNext = true;
            nextStatusNA = false;
          } else if (attemptStatus === "Attempted" && !["PASS", "PASSED"].includes(result?.toUpperCase())) {
            allowNext = false;
            nextStatusNA = false;
          } else if (attemptStatus === "NA") {
            allowNext = false;
            nextStatusNA = true;
          } else if (attemptStatus === "Not Attempted") {
            allowNext = false;
            nextStatusNA = false;
          }
        } else {
         
          if (nextStatusNA) {
            et.status = "NA";
          } else {
            et.status = allowNext ? "Eligible" : "Not Eligible";
          }

          
          if (attemptStatus === "Attempted" && !["PASS", "PASSED"].includes(result?.toUpperCase())) {
            allowNext = false;
            nextStatusNA = false;
          } else if (attemptStatus === "Not Attempted") {
            allowNext = false;
            nextStatusNA = false;
          } else if (attemptStatus === "NA") {
            allowNext = false;
            nextStatusNA = true;
          }
        }
      });
    });

    await user.save();

   
    const responseUserDetails = user.userDetails.map((ud) => ({
      _id: ud._id,
      category: {
        _id: ud.category?._id || null,
        name: ud.category?.name || "NA",
      },
      examTypes: ud.examTypes.map((et) => ({
        _id: et._id,
        name: et.name,
        status: et.status,
        AttemptStatus: et.AttemptStatus,
        result: et.result,
        exam: et.exam
          ? {
              _id: et.exam,
              examName: examNameMap[et.exam.toString()] || "NA",
            }
          : null,
      })),
    }));

    return res.status(200).json({
      success: true,
      message: "User details fetched successfully",
      data: {
        firstName: user.firstName,
        status: user.status,
        schoolershipstatus: user.schoolershipstatus,
        category: {
          _id: user?.category?._id?._id || null,
          name: user?.category?._id?.name || "NA",
        },
        userDetails: responseUserDetails,
      },
    });
  } catch (error) {
    console.error("getUserById error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};



exports.deleteUserExamData = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Valid userId is required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    
    user.userDetails.forEach((detail) => {
      detail.examTypes.forEach((exam) => {
        exam.result = "NA";
        exam.AttemptStatus = "NA";
        exam.exam = null;
        exam.status = "NA"; 
      });
    });

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User exam result, AttemptStatus and exam reset successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


exports.getClassTimeline = async (req, res) => {
  try {
    const userId = req.user.id;

    // 🔹 USER
    const user = await User.findById(userId)
      .populate('updatedBy', 'session startDate endDate');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 🔹 USER HISTORY
    const history = await UserHistory.find({
      originalUserId: user._id
    })
      .populate('updatedBy', 'session startDate endDate')
      .sort({ clonedAt: -1 });

    const timeline = [];

    // 🔹 CURRENT USER CLASS
    if (mongoose.Types.ObjectId.isValid(user.className)) {
      const classDetails =
        (await School.findById(user.className)) ||
        (await College.findById(user.className));

      timeline.push({
        classOrYear: classDetails?.name || '',
        startDate: user.startDate || user.updatedBy?.startDate || '',
        endDate: user.endDate || user.updatedBy?.endDate || '',
        session: user.session || user.updatedBy?.session || ''
      });
    }

    // 🔹 HISTORY CLASSES
    for (const h of history) {
      let className = '';

      if (mongoose.Types.ObjectId.isValid(h.className)) {
        const classDetails =
          (await School.findById(h.className)) ||
          (await College.findById(h.className));

        className = classDetails?.name || '';
      }

      timeline.push({
        classOrYear: className,
        startDate: h.startDate || h.updatedBy?.startDate || '',
        endDate: h.endDate || h.updatedBy?.endDate || '',
        session: h.session || h.updatedBy?.session || ''
      });
    }

    return res.status(200).json({
      classTimeline: timeline
    });

  } catch (error) {
    console.error('Get Class Timeline Error:', error);
    return res.status(500).json({ message: error.message });
  }
};

