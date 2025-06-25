const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const College = require('../models/college');
const School = require('../models/school');
const mongoose = require('mongoose');
const AdminSchool = require('../models/adminschool');
const AdminCollege = require('../models/admincollege');
const nodemailer = require('nodemailer');


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
        (await College.findById(className)) ||
        (await Institute.findById(className));
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

exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // === Fetch User with Country/State/City populated ===
    const user = await User.findById(userId)
      .populate('countryId', 'name')
      .populate('stateId', 'name')
      .populate('cityId', 'name');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const classId = user.className;
    let classDetails = '';

    // === Fetch classOrYear name from AdminSchool or AdminCollege using classId ===
    if (mongoose.Types.ObjectId.isValid(classId)) {
      const adminSchool = await AdminSchool.findById(classId).populate('className', 'name');
      const adminCollege = await AdminCollege.findById(classId).populate('className', 'name');

      const entry = adminSchool || adminCollege;

      if (entry && entry.className && typeof entry.className === 'object') {
        classDetails = entry.className.name;
      }
    }

    // === Add base URL to Aadhar & Marksheet if available ===
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    if (user.aadharCard) user.aadharCard = `${baseUrl}/${user.aadharCard}`;
    if (user.marksheet) user.marksheet = `${baseUrl}/${user.marksheet}`;

    // === Construct formatted user object ===
    const formattedUser = {
      ...user._doc,
      country: user.countryId?.name || '',
      state: user.stateId?.name || '',
      city: user.cityId?.name || '',
      institutionName: user.schoolName || user.collegeName || user.instituteName || '',
      institutionType: user.studentType || '',
      classOrYear: classDetails || '',
    };

    res.status(200).json({
      message: 'User profile fetched successfully.',
      user: formattedUser
    });
  } catch (error) {
    console.error('Get User Profile Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// exports.getUserProfile = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const user = await User.findById(userId)
//       .populate('countryId', 'name')
//       .populate('stateId', 'name')
//       .populate('cityId', 'name');

//     if (!user) {
//       return res.status(404).json({ message: 'User not found.' });
//     }

//     const classId = user.className;
//     let classDetails = null;

//     if (mongoose.Types.ObjectId.isValid(classId)) {
//       classDetails =
//         (await School.findById(classId)) ||
//         (await College.findById(classId)) ||
//         (await Institute.findById(classId));
//     }

//     const baseUrl = `${req.protocol}://${req.get('host')}`;
//     if (user.aadharCard) user.aadharCard = `${baseUrl}/${user.aadharCard}`;
//     if (user.marksheet) user.marksheet = `${baseUrl}/${user.marksheet}`;

//     const formattedUser = {
//       ...user._doc,
//       country: user.countryId?.name || '',
//       state: user.stateId?.name || '',
//       city: user.cityId?.name || '',
//       institutionName: user.schoolName || user.collegeName || user.instituteName || '',
//       institutionType: user.studentType || '',
//       classOrYear: classDetails?.name || '',
//     };

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
      collegeName,
      // status: 'no' 
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

    
    const user = await User.findByIdAndUpdate(userId, updatedFields, { new: true })
      .populate('countryId')
      .populate('stateId')
      .populate('cityId');

    
    let classDetails = null;
    if (mongoose.Types.ObjectId.isValid(className)) {
      classDetails =
        (await School.findById(className)) ||
        (await College.findById(className)) ||
        (await Institute.findById(className));
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
