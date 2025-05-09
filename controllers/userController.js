const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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

    res.status(201).json({ message: 'Registered successfully. Redirecting to complete your profile.' });

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
      return res.status(401).json({ message: 'Invalid credentials.' });

    // ✅ Generate JWT token
    const payload = { id: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.status(200).json({
      message: 'Login successful.',
      user,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

  exports.completeProfile = async (req, res) => {
    try {
      const userId = req.params.id;
      const {
        country, state, city, pincode,
        institutionType, institutionName,
        classOrYear
      } = req.body;
  
      if (pincode && !/^\d+$/.test(pincode)) {
        return res.status(400).json({ message: 'Invalid Pincode' });
      }
  
      const updatedFields = {
        country,
        state,
        city,
        pincode,
        institutionType,
        institutionName,
        classOrYear
      };
  
      if (req.files?.aadharCard) {
        updatedFields.aadharCard = req.files.aadharCard[0].path;
      }
  
      if (req.files?.lastYearMarksheet) {
        updatedFields.lastYearMarksheet = req.files.lastYearMarksheet[0].path;
      }
  
      const updatedUser = await User.findByIdAndUpdate(userId, updatedFields, { new: true });
  
      res.status(200).json({ message: 'Profile updated. Redirecting to home page.', user: updatedUser });
    } catch (error) {
      const fileError = error.message.includes('file') ? error.message : 'Server error';
      res.status(500).json({ message: fileError });
    }
  };
  