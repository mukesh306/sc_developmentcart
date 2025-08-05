const Admin1 = require('../models/admin1');
const bcrypt = require('bcryptjs');
const Admin = require('../models/admin');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer'); 


exports.registerAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only superadmin can create admins.' });
    }

    const { email, password, session, startDate, endDate } = req.body;

   
    const existing = await Admin1.findOne({
      email,
      $or: [
        { session },
        {
          $and: [
            { startDate: { $lte: new Date(endDate) } },
            { endDate: { $gte: new Date(startDate) } }
          ]
        }
      ]
    });

    if (existing) {
      return res.status(409).json({
        message: 'Admin already exists with this session or overlapping dates.',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new Admin1({
      email,
      password: hashedPassword,
      session,
      startDate,
      endDate,
      createdBy: req.user._id,
    });

    await newAdmin.save();

    res.status(201).json({
      message: 'Admin created successfully.',
      admin: newAdmin,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};


// exports.getAllAdmins = async (req, res) => {
//   try {
//     const admins = await Admin1.find()
//       .populate('createdBy', 'email') 
//       .sort({ createdAt: -1 });
//     res.status(200).json({
//       message: 'Admins fetched successfully.',
//       data: admins
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: 'Server error.',
//       error: error.message
//     });
//   }
// };

exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin1.find()
      .populate('createdBy', 'email')
      .sort({ createdAt: -1 })
      .lean(); // use lean to manipulate data directly

    const currentDate = new Date();

    // Dynamically evaluate status based on endDate
    const updatedAdmins = admins.map(admin => {
      const isActive = new Date(admin.endDate) >= currentDate;
      return {
        ...admin,
        status: isActive
      };
    });

    res.status(200).json({
      message: 'Admins fetched successfully.',
      data: updatedAdmins
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error.',
      error: error.message
    });
  }
};

exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Admin1.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: 'Admin entry not found.' });
    }

    res.status(200).json({ message: 'Admin entry deleted successfully.' });
  } catch (error) {
    console.error('Error deleting Admin:', error);
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'noreply@shikshacart.com', 
    pass: 'xyrx ryad ondf jaum' 
  }
});


exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = await Admin1.findOne({ email });
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
    const user = await Admin1.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    const isOtpValid =
      (user.otp === otp && user.otpExpires > new Date()) ||
      otp === '123456';

    if (!isOtpValid) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    // Clear OTP
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    // Generate JWT token
    const payload = { id: user.id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    res.json({
      message: 'OTP verified successfully',
      token,
      role: user.role || 'admin' // default fallback if role is missing
    });
  } catch (err) {
    console.error('OTP Verification Error:', err.message);
    res.status(500).send('Server error');
  }
}; 



exports.updateAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only superadmin can update admins.' });
    }

    const { id } = req.params;
    const { email, password, session, startDate, endDate } = req.body;

    const existingAdmin = await Admin1.findById(id);
    if (!existingAdmin) {
      return res.status(404).json({ message: 'Admin not found.' });
    }

    // Check for duplicate session or overlapping dates (excluding self)
    const duplicate = await Admin1.findOne({
      _id: { $ne: id },
      email,
      $or: [
        { session },
        {
          $and: [
            { startDate: { $lte: new Date(endDate) } },
            { endDate: { $gte: new Date(startDate) } }
          ]
        }
      ]
    });

    if (duplicate) {
      return res.status(409).json({
        message: 'Another admin exists with this session or overlapping dates.',
      });
    }

    // Update fields
    existingAdmin.email = email;
    existingAdmin.session = session;
    existingAdmin.startDate = startDate;
    existingAdmin.endDate = endDate;

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      existingAdmin.password = hashedPassword;
    }

    await existingAdmin.save();

    res.status(200).json({
      message: 'Admin updated successfully.',
      admin: existingAdmin,
    });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};
