const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const College = require('../models/college');
const School = require('../models/school');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const Admin1 = require('../models/admin1'); 
const fs = require('fs');
const path = require('path');
const moment = require('moment');
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

//     const user = await User.findById(userId)
//       .populate('countryId', 'name')
//       .populate('stateId', 'name')
//       .populate('cityId', 'name')
//       .lean(); // Add `.lean()` to simplify processing

//     if (!user) {
//       return res.status(404).json({ message: 'User not found.' });
//     }

//     const classId = user.className;
//     let classDetails = '';
//     let validClassName = classId;

//     if (mongoose.Types.ObjectId.isValid(classId)) {
//       const adminSchool = await AdminSchool.findById(classId).populate('className', 'name').lean();
//       const adminCollege = await AdminCollege.findById(classId).populate('className', 'name').lean();
//       const entry = adminSchool || adminCollege;

//       if (entry && entry.className && typeof entry.className === 'object') {
//         classDetails = entry.className.name;
//         validClassName = entry.className._id;
//       } else {
//         // className reference is invalid (e.g., deleted), so ignore it
//         validClassName = null;
//       }
//     }

//     // Add base URL to Aadhar & Marksheet if available
//     const baseUrl = `${req.protocol}://${req.get('host')}`;
//     if (user.aadharCard) user.aadharCard = `${baseUrl}/${user.aadharCard}`;
//     if (user.marksheet) user.marksheet = `${baseUrl}/${user.marksheet}`;

//     const formattedUser = {
//       ...user,
//       country: user.countryId?.name || '',
//       state: user.stateId?.name || '',
//       city: user.cityId?.name || '',
//       institutionName: user.schoolName || user.collegeName || user.instituteName || '',
//       institutionType: user.studentType || '',
//       classOrYear: classDetails || '',
//     };

//     // Clean up invalid className from response
//     if (!validClassName) {
//       formattedUser.className = null;
//     }

//     res.status(200).json({
//       message: 'User profile fetched successfully.',
//       user: formattedUser,
//     });
//   } catch (error) {
//     console.error('Get User Profile Error:', error);
//     res.status(500).json({ message: error.message });
//   }
// };





// exports.getUserProfile = async (req, res) => {
//   try {
//     const userId = req.user.id;
//     let user = await User.findById(userId)
//       .populate('countryId', 'name')
//       .populate('stateId', 'name')
//       .populate('cityId', 'name');

//     if (!user) {
//       return res.status(404).json({ message: 'User not found.' });
//     }

//     let classId = user.className;
//     let classDetails = null;

//     if (mongoose.Types.ObjectId.isValid(classId)) {
//       classDetails =
//         (await School.findById(classId)) ||
//         (await College.findById(classId));
//         // (await Institute.findById(classId));
//     }

//     const baseUrl = `${req.protocol}://${req.get('host')}`;
//     if (user.aadharCard) user.aadharCard = `${baseUrl}/${user.aadharCard}`;
//     if (user.marksheet) user.marksheet = `${baseUrl}/${user.marksheet}`;

//     // ❗ If price is null, remove className from both response and DB
//     if (!classDetails || classDetails.price == null) {
//       classId = null;

//       // update in DB as well
//       await User.findByIdAndUpdate(userId, { className: null });
//       user.className = null; // update current object for response
//     }

//     const formattedUser = {
//       ...user._doc,
//       className: classId,
//       country: user.countryId?.name || '',
//       state: user.stateId?.name || '',
//       city: user.cityId?.name || '',
//       institutionName: user.schoolName || user.collegeName || user.instituteName || '',
//       institutionType: user.studentType || '',
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

    let user = await User.findById(userId)
      .populate('countryId', 'name')
      .populate('stateId', 'name')
      .populate('cityId', 'name')
      .populate('updatedBy', 'email session startDate endDate');

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

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    if (user.aadharCard && fs.existsSync(user.aadharCard)) {
      user.aadharCard = `${baseUrl}/uploads/${path.basename(user.aadharCard)}`;
    }
    if (user.marksheet && fs.existsSync(user.marksheet)) {
      user.marksheet = `${baseUrl}/uploads/${path.basename(user.marksheet)}`;
    }

    if (!classDetails || classDetails.price == null) {
      classId = null;
      await User.findByIdAndUpdate(userId, { className: null });
      user.className = null;
    } else {
      let institutionUpdatedBy = classDetails?.updatedBy || null;
      if (institutionUpdatedBy) {
        await User.findByIdAndUpdate(userId, { updatedBy: institutionUpdatedBy });
        user = await User.findById(userId)
          .populate('countryId', 'name')
          .populate('stateId', 'name')
          .populate('cityId', 'name')
          .populate('updatedBy', 'email session startDate endDate');

        if (user.aadharCard && fs.existsSync(user.aadharCard)) {
          user.aadharCard = `${baseUrl}/uploads/${path.basename(user.aadharCard)}`;
        }
        if (user.marksheet && fs.existsSync(user.marksheet)) {
          user.marksheet = `${baseUrl}/uploads/${path.basename(user.marksheet)}`;
        }
      }
    }

    // ✅ Set status = "no" if endDate is greater than current date
   if (user.updatedBy?.endDate) {
  const endDate = moment(user.updatedBy.endDate, 'DD-MM-YYYY');
  const currentDate = moment();

  if (endDate.isBefore(currentDate, 'day')) {
    await User.findByIdAndUpdate(userId, { status: 'no' });
    user.status = 'no';
  }
}

    const formattedUser = {
      ...user._doc,
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

    res.status(200).json({
      message: 'User profile fetched successfully.',
      user: formattedUser
    });

  } catch (error) {
    console.error('Get User Profile Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// second last

// exports.getUserProfile = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     let user = await User.findById(userId)
//       .populate('countryId', 'name')
//       .populate('stateId', 'name')
//       .populate('cityId', 'name')
//       .populate('updatedBy', 'email session startDate endDate');

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

//     const baseUrl = `${req.protocol}://${req.get('host')}`;

   
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
//       let institutionUpdatedBy = classDetails?.updatedBy || null;
//       if (institutionUpdatedBy) {
//         await User.findByIdAndUpdate(userId, { updatedBy: institutionUpdatedBy });
//         user = await User.findById(userId)
//           .populate('countryId', 'name')
//           .populate('stateId', 'name')
//           .populate('cityId', 'name')
//           .populate('updatedBy', 'email session startDate endDate');

//         if (user.aadharCard && fs.existsSync(user.aadharCard)) {
//           user.aadharCard = `${baseUrl}/uploads/${path.basename(user.aadharCard)}`;
//         }
//         if (user.marksheet && fs.existsSync(user.marksheet)) {
//           user.marksheet = `${baseUrl}/uploads/${path.basename(user.marksheet)}`;
//         }
//       }
//     }

//     const formattedUser = {
//       ...user._doc,
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
        user: 'mukeshkumarbst33@gmail.com', 
    pass: 'xdiw vbqx uckh asip' 
      },
    });

    await transporter.sendMail({
      from: 'mukeshkumarbst33@gmail.com',
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
        user: 'mukeshkumarbst33@gmail.com',
        pass: 'xdiw vbqx uckh asip',
      },
    });

    await transporter.sendMail({
      from: 'mukeshkumarbst33@gmail.com',
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
        user: 'mukeshkumarbst33@gmail.com', 
    pass: 'xdiw vbqx uckh asip' 
      },
    });

    await transporter.sendMail({
      from: 'mukeshkumarbst33@gmail.com',
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
//       collegeName,
//       // status: 'no' 
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

//     const user = await User.findByIdAndUpdate(userId, updatedFields, { new: true })
//       .populate('countryId')
//       .populate('stateId')
//       .populate('cityId');

//     let classDetails = null;
//     if (mongoose.Types.ObjectId.isValid(className)) {
//       classDetails =
//         (await School.findById(className)) ||
//         (await College.findById(className)) ;
//         // (await Institute.findById(className));
//     }
//     const formattedUser = {
//       ...user._doc,
//       country: user.countryId?.name || '',
//       state: user.stateId?.name || '',
//       city: user.cityId?.name || '',
//       institutionName: schoolName || collegeName || instituteName || '',
//       institutionType: studentType || '',
//       classOrYear: classDetails?.name || '',
//     };

//     res.status(200).json({
//       message: 'Profile updated. Redirecting to home page.',
//       user: formattedUser
//     });

//   } catch (error) {
//     console.error('Complete Profile Error:', error);
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

    // === Fetch class updatedBy and add to user update ===
    let classDetails = null;
    if (mongoose.Types.ObjectId.isValid(className)) {
      classDetails = await School.findById(className) || await College.findById(className);
      if (classDetails?.updatedBy) {
        updatedFields.updatedBy = classDetails.updatedBy;
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
//       collegeName,
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

//     const user = await User.findByIdAndUpdate(userId, updatedFields, { new: true })
//       .populate('countryId', 'name')
//       .populate('stateId', 'name')
//       .populate('cityId', 'name');

//     // === Fetch classOrYear name from AdminSchool or AdminCollege using className ===
//     let classDetails = '';
//     if (mongoose.Types.ObjectId.isValid(className)) {
//       const adminSchool = await AdminSchool.findById(className).populate('className', 'name');
//       const adminCollege = await AdminCollege.findById(className).populate('className', 'name');
//       const entry = adminSchool || adminCollege;
//       if (entry?.className?.name) {
//         classDetails = entry.className.name;
//       }
//     }

//     const baseUrl = `${req.protocol}://${req.get('host')}`;
//     if (user.aadharCard) user.aadharCard = `${baseUrl}/${user.aadharCard}`;
//     if (user.marksheet) user.marksheet = `${baseUrl}/${user.marksheet}`;

//     const formattedUser = {
//       ...user._doc,
//       country: user.countryId?.name || '',
//       state: user.stateId?.name || '',
//       city: user.cityId?.name || '',
//       institutionName: schoolName || collegeName || instituteName || '',
//       institutionType: studentType || '',
//       classOrYear: classDetails || '',
//     };

//     res.status(200).json({
//       message: 'Profile updated. Redirecting to home page.',
//       user: formattedUser
//     });

//   } catch (error) {
//     console.error('Complete Profile Error:', error);
//     res.status(500).json({ message: error.message });
//   }
// };



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
