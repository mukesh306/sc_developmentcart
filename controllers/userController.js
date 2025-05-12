const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const College = require('../models/college');
const School = require('../models/school');
const mongoose = require('mongoose');

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

    // Validation: Required fields
    if (!firstName) return res.status(400).json({ message: 'First Name can’t remain empty.' });
    if (!lastName) return res.status(400).json({ message: 'Last Name can’t remain empty.' });
    if (!mobileNumber) return res.status(400).json({ message: 'Mobile Number can’t remain empty.' });
    if (!email) return res.status(400).json({ message: 'Email address can’t remain empty.' });
    if (!password) return res.status(400).json({ message: 'Create Password can’t remain empty.' });
    if (!confirmPassword) return res.status(400).json({ message: 'Confirm Password can’t remain empty.' });

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: 'Password must contain at least 8 characters with a mix of uppercase, lowercase letters and numbers.'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { mobileNumber }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email or mobile already exists.' });
    }

    // Hash password
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

    // Generate token
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.status(201).json({
      message: 'Registered successfully. Redirecting to complete your profile.',
      token,
      
    });

  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error during signup.' });
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

    // ✅ Generate JWT token
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

    // Only assign ObjectId fields if they are valid non-empty values
    if (mongoose.Types.ObjectId.isValid(countryId)) updatedFields.countryId = countryId;
    if (mongoose.Types.ObjectId.isValid(stateId)) updatedFields.stateId = stateId;
    if (mongoose.Types.ObjectId.isValid(cityId)) updatedFields.cityId = cityId;
    if (mongoose.Types.ObjectId.isValid(className)) updatedFields.className = className;

    // Handle file uploads
    if (req.files?.aadharCard?.[0]) {
      updatedFields.aadharCard = req.files.aadharCard[0].path;
    }
    if (req.files?.marksheet?.[0]) {
      updatedFields.marksheet = req.files.marksheet[0].path;
    }

    let user = await User.findByIdAndUpdate(userId, updatedFields, { new: true })
      .populate('countryId')
      .populate('stateId')
      .populate('cityId');

    // Populate className based on studentType
    let classDetails = null;
    if (studentType === 'school' && mongoose.Types.ObjectId.isValid(className)) {
      classDetails = await School.findById(className);
    } else if (studentType === 'college' && mongoose.Types.ObjectId.isValid(className)) {
      classDetails = await College.findById(className);
    } else if (studentType === 'institute' && mongoose.Types.ObjectId.isValid(className)) {
      classDetails = await Institute.findById(className);
    }

    // Final user formatting
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

    const user = await User.findById(userId)
      .populate('countryId', 'name')
      .populate('stateId', 'name')
      .populate('cityId', 'name')
      .populate('className', 'name');

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.status(200).json({
      message: 'User profile fetched successfully.',
      user,
    });
  } catch (error) {
    console.error('Get User Profile Error:', error);
    res.status(500).json({ message: error.message });
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

    // Clear OTP fields after successful login
    user.resetPasswordOTP = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
 
    // Generate JWT token
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

    await User.findByIdAndUpdate(userId, { password: hashedPassword });

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ message: error.message });
  }
};