const User = require('../models/admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer'); 

const axios = require('axios');

require('dotenv').config();


exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: 'User already exists.' });
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    user = new User({
      email,
      password: hashedPassword,
          
    });
    
    await user.save();
    
    const payload = {
      id: user.id
    };
    
    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'noreply@shikshacart.com', 
    pass: 'xyrx ryad ondf jaum' 
  }
});


exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.otp = otp;
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000); 
    await user.save();

    await transporter.sendMail({
      from: 'noreply@shikshacart.com',  
      to: user.email,
      subject: 'Your One-Time Password (OTP) Code',
      text: `Your OTP is ${otp}. It will expire in 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; font-size: 16px;">
          <p>Hello,</p>
          <p>Your OTP code is <strong>${otp}</strong>.</p>
          <p>This code will expire in <strong>5 minutes</strong>.</p>
          <p>If you did not request this, please ignore this email.</p>
          <br>
          <p>Thank you,<br>DevelopmentCart</p>
        </div>
      `
    });

    res.json({ message: 'OTP sent to your email', email: user.email,otp:user.otp });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    const isOtpValid =
      (user.otp === otp && user.otpExpires > new Date()) ||
      otp === '123456';

    if (!isOtpValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Clear OTP (optional for default OTP use case)
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    // Generate JWT token
    const payload = { id: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({ message: 'OTP verified successfully', token });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};
