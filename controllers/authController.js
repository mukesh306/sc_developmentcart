const User = require('../models/admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


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


// exports.login = async (req, res) => {
//   try {
//     const { email, password } = req.body;

//     if (!email || !password) {
//       return res.status(400).json({ message: 'Email and password are required.' });
//     }

//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(400).json({ message: 'Invalid credentials' });
//     }

//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ message: 'Invalid credentials' });
//     }

//     // Generate OTP and expiry
//     const otp = Math.floor(100000 + Math.random() * 900000).toString();
//     const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

//     // Save OTP and expiry to user
//     user.otp = otp;
//     user.otpExpires = otpExpires;
//     await user.save();

//     // Environment variables
//     const { EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PRIVATE_KEY } = process.env;

//     if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PRIVATE_KEY) {
//       return res.status(500).json({ message: 'EmailJS configuration missing.' });
//     }

//     // Prepare email data
//     const emailData = {
//       service_id: EMAILJS_SERVICE_ID,
//       template_id: EMAILJS_TEMPLATE_ID,
//       template_params: {
//         to_email: user.email,
//         to_name: user.name || 'User',
//         otp: otp,
//       },
//     };

//     // Send email with Authorization Bearer Token
//     await axios.post('https://api.emailjs.com/api/v1.0/email/send', emailData, {
//       headers: {
//         'Content-Type': 'application/json',
//         'Authorization': `Bearer ${EMAILJS_PRIVATE_KEY}`,
//       },
//     });

//     return res.status(200).json({ message: 'OTP sent to email.' });

//   } catch (err) {
//     console.error('Login error:', err.message);
//     if (err.response) {
//       console.error('EmailJS error:', err.response.data);
//     }
//     return res.status(500).json({ message: 'Server error' });
//   }
// };




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
  
      // Generate a 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Save OTP and expiry (5 minutes)
      user.otp = otp;
      user.otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
      await user.save();
  
      // You can send OTP to email here using nodemailer or other services
      
      res.json({ message: 'OTP sent to your email', email: user.email });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  };



  exports.verifyOtp = async (req, res) => {
    try {
      const { email, otp } = req.body;
  
      const user = await User.findOne({ email });
      if (!user || user.otp !== otp || user.otpExpires < new Date()) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }
  
      // OTP is valid, now clear it
      user.otp = null;
      user.otpExpires = null;
      await user.save();
  
      // Generate token after successful verification
      const payload = { id: user.id };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });
  
      res.json({ message: 'OTP verified successfully', token });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  };
  

// exports.login = async (req, res) => {
//   try {
//     const { email, password } = req.body;
    
//     let user = await User.findOne({ email });
//     if (!user) {
//       return res.status(400).json({ message: 'Invalid credentials' });
//     }
    
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(400).json({ message: 'Invalid credentials' });
//     }
    
//     const payload = {
//       id: user.id
//     };
    
//     jwt.sign(
//       payload,
//       process.env.JWT_SECRET,
//       { expiresIn: '1h' },
//       (err, token) => {
//         if (err) throw err;
//         res.json({ token });
//       }
//     );
//   } catch (err) {
//     console.error(err.message);
//     res.status(500).send('Server error');
//   }
// };

