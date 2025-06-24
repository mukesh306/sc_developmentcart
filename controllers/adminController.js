const Admin1 = require('../models/admin1');
const bcrypt = require('bcryptjs');
const Admin = require('../models/admin');
const jwt = require('jsonwebtoken');

exports.registerAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Only superadmin can create admins.' });
    }

    const { email, password, session, startDate, endDate } = req.body;

    const existing = await Admin1.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Admin already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = new Admin1({
      email,
      password: hashedPassword,
      session,
      startDate,
      endDate,
      createdBy: req.user._id 
    });

    await newAdmin.save();

    res.status(201).json({ message: 'Admin created successfully.', admin: newAdmin });
  } catch (error) {
    res.status(500).json({ message: 'Server error.', error: error.message });
  }
};


exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = await Admin.findOne({ email }) || await Admin1.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid password' });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.status(200).json({
      token,
      role: user.role,
      message: 'Login successful'
    });
  } catch (err) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
};


exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin1.find()
      .populate('createdBy', 'email') 
      .sort({ createdAt: -1 });
    res.status(200).json({
      message: 'Admins fetched successfully.',
      data: admins
    });
  } catch (error) {
    res.status(500).json({
      message: 'Server error.',
      error: error.message
    });
  }
};
