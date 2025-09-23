const OrganizationSign = require('../models/organizationSign');
const bcrypt = require('bcryptjs');
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Organizationuser = require('../models/organizationuser');
const School = require('../models/school');
const College = require('../models/college');


exports.createOrganizationSign = async (req, res) => {
  try {
    const { firstName, middleName, lastName, mobileNumber, email, password, studentType, instituteName } = req.body;

    if (!firstName || !lastName || !mobileNumber || !email || !password) {
      return res.status(400).json({ message: 'Required fields are missing.' });
    }

    const existingUser = await OrganizationSign.findOne({ $or: [{ email }, { mobileNumber }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Email or Mobile number already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const orgSign = new OrganizationSign({
      firstName,
      middleName,
      lastName,
      mobileNumber,
      email,
      password: hashedPassword,
      studentType,
      instituteName,
      otp,
      otpExpires: Date.now() + 5 * 60 * 1000 // 5 minutes expiry
    });

    await orgSign.save();

    // Send OTP email
    const mailOptions = {
      from: "noreply@shikshacart.com",
      to: email,
      subject: "Verify your email - OTP",
      text: `Your OTP for account verification is ${otp}. It will expire in 5 minutes.`
    };

    await transporter.sendMail(mailOptions);

    // ✅ Return OTP in response for now
    res.status(201).json({ 
      message: "Organization Sign created successfully. OTP sent to email for verification.",
      userId: orgSign._id,
      otp 
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



exports.getOrganizationSigns = async (req, res) => {
  try {
    const signs = await OrganizationSign.find();
    res.json(signs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getOrganizationSignById = async (req, res) => {
  try {
    const orgSign = await OrganizationSign.findById(req.user.id).select(
      "firstName middleName lastName mobileNumber email studentType instituteName"
    );

    if (!orgSign) {
      return res.status(404).json({ message: "Organization Sign not found" });
    }

    return res.status(200).json({
      message: "Organization Sign fetched successfully.",
      data: orgSign
    });
  } catch (err) {
    console.error("Get OrganizationSign Error:", err);
    res.status(500).json({ message: err.message });
  }
};



exports.updateOrganizationSign = async (req, res) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      mobileNumber,
      email,
      password,
      studentType,
      instituteName,
      session,
      createdBy
    } = req.body;

    // ✅ अब id token से आएगी
    const orgSign = await OrganizationSign.findById(req.user.id); // या req.user._id (JWT generate code पर depend करेगा)

    if (!orgSign) {
      return res.status(404).json({ message: 'Organization Sign not found' });
    }

    // ✅ firstName, middleName, lastName
    if (firstName) orgSign.firstName = firstName;
    if (middleName) orgSign.middleName = middleName;
    if (lastName) orgSign.lastName = lastName;

    // ✅ mobileNumber update
    if (mobileNumber) {
      if (mobileNumber !== orgSign.mobileNumber) {
        const existingMobile = await OrganizationSign.findOne({ mobileNumber });
        if (existingMobile) {
          return res.status(400).json({ message: "Mobile number already exists." });
        }
        orgSign.mobileNumber = mobileNumber;
      }
    }

    // ✅ email update
    if (email) {
      if (email !== orgSign.email) {
        const existingEmail = await OrganizationSign.findOne({ email });
        if (existingEmail) {
          return res.status(400).json({ message: "Email already exists." });
        }
        orgSign.email = email;
      }
    }

    // ✅ password
    if (password) orgSign.password = await bcrypt.hash(password, 10);

    // ✅ student info
    if (studentType) orgSign.studentType = studentType;
    if (instituteName) orgSign.instituteName = instituteName;
    if (session) orgSign.session = session;

    // ✅ createdBy update (optional)
    if (createdBy) orgSign.createdBy = createdBy;

    await orgSign.save();

    return res.json({
      message: 'Organization Sign updated successfully',
      orgSign
    });

  } catch (err) {
    console.error("Update OrganizationSign Error:", err);
    res.status(500).json({ message: err.message });
  }
};





exports.deleteOrganizationSign = async (req, res) => {
  try {
    const orgSign = await OrganizationSign.findByIdAndDelete(req.params.id);
    if (!orgSign) return res.status(404).json({ message: 'Organization Sign not found' });
    res.json({ message: 'Organization Sign deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};





const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
       user: 'noreply@shikshacart.com', 
       pass: 'xyrx ryad ondf jaum' 
     }
});

exports.loginOrganization = async (req, res) => {
  try {
    const { email, password } = req.body;

    const orgUser = await OrganizationSign.findOne({ email });
    if (!orgUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // ❌ Agar email verify nahi hai
    if (!orgUser.isVerified) {
      return res.status(403).json({ message: "Please verify your email before logging in." });
    }

    const isMatch = await bcrypt.compare(password, orgUser.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: orgUser._id, email: orgUser.email },
      process.env.JWT_SECRET || "SECRET_KEY",
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: orgUser._id,
        firstName: orgUser.firstName,
        lastName: orgUser.lastName,
        email: orgUser.email,
        mobileNumber: orgUser.mobileNumber
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.verifySignupOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const orgUser = await OrganizationSign.findOne({ email });
    if (!orgUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (orgUser.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (orgUser.otpExpires < Date.now()) {
      return res.status(400).json({ message: "OTP expired" });
    }

    // ✅ Verify
    orgUser.isVerified = true;

    // ✅ OTP history save
    orgUser.otpHistory.push({
      otp: orgUser.otp,
      status: "used",
      verifiedAt: new Date()
    });

    // ✅ Clear OTP fields
    orgUser.otp = null;
    orgUser.otpExpires = null;

    await orgUser.save();

    const token = jwt.sign(
      { id: orgUser._id, email: orgUser.email },
      process.env.JWT_SECRET || "SECRET_KEY",
      { expiresIn: "1d" }
    );

    res.json({
      message: "Email verified successfully. Login successful.",
      token,
      user: {
        id: orgUser._id,
        firstName: orgUser.firstName,
        lastName: orgUser.lastName,
        email: orgUser.email
      }
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.forgetPasswordRequest = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await OrganizationSign.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // OTP generate
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000; // 10 min expiry
    await user.save();

    // Send OTP email
    const mailOptions = {
      from: "noreply@shikshacart.com",
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP for login is ${otp}. It will expire in 10 minutes.`
    };

    await transporter.sendMail(mailOptions);

    // ✅ Response में OTP भी भेज रहे हैं
    res.json({
      message: "OTP sent to your email.",
      otp
    });

  } catch (err) {
    console.error("Forget Password Request Error:", err);
    res.status(500).json({ message: err.message });
  }
};


exports.verifyForgetPasswordOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await OrganizationSign.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // OTP check
    if (user.otp !== otp) return res.status(400).json({ message: "Invalid OTP" });

    // Expiry check
    if (user.otpExpires < Date.now()) return res.status(400).json({ message: "OTP expired" });

    // ✅ If user was not verified, mark verified now
    if (!user.isVerified) {
      user.isVerified = true;
    }

    // OTP history save
    user.otpHistory.push({
      otp: user.otp,
      status: "used",
      verifiedAt: new Date()
    });

    // Clear OTP after verification
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    // Generate JWT token immediately
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || "SECRET_KEY",
      { expiresIn: "1d" }
    );

    res.json({
      message: "OTP verified successfully.",
      token
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


exports.organizationUser = async (req, res) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      mobileNumber,
      email,
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

    // ✅ Only email is required
    if (!email) return res.status(400).json({ message: 'Email address can’t remain empty.' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ message: 'Please enter a valid email address.' });

    // Check existing user
    let user = await Organizationuser.findOne({ email });

    const updatedFields = {
      firstName,
      middleName,
      lastName,
      mobileNumber,
      email,
      countryId: mongoose.Types.ObjectId.isValid(countryId) ? countryId : undefined,
      stateId: mongoose.Types.ObjectId.isValid(stateId) ? stateId : undefined,
      cityId: mongoose.Types.ObjectId.isValid(cityId) ? cityId : undefined,
      pincode,
      studentType,
      schoolName,
      instituteName,
      collegeName,
      className: mongoose.Types.ObjectId.isValid(className) ? className : undefined
    };

    if (req.files?.aadharCard?.[0]) updatedFields.aadharCard = req.files.aadharCard[0].path;
    if (req.files?.marksheet?.[0]) updatedFields.marksheet = req.files.marksheet[0].path;

    if (user) {
      // Update existing user
      user = await Organizationuser.findByIdAndUpdate(user._id, updatedFields, { new: true });
    } else {
      // Create new user
      user = new Organizationuser(updatedFields);
      await user.save();
    }

    await user.populate('countryId stateId cityId');

    // Get class details
    let classDetails = null;
    if (mongoose.Types.ObjectId.isValid(className)) {
      classDetails =
        (await School.findById(className)) ||
        (await College.findById(className)) ||
        (await Institute.findById(className));
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    if (user.aadharCard && fs.existsSync(user.aadharCard)) user.aadharCard = `${baseUrl}/uploads/${path.basename(user.aadharCard)}`;
    if (user.marksheet && fs.existsSync(user.marksheet)) user.marksheet = `${baseUrl}/uploads/${path.basename(user.marksheet)}`;

    const formattedUser = {
      ...user._doc,
      country: user.countryId?.name || '',
      state: user.stateId?.name || '',
      city: user.cityId?.name || '',
      institutionName: schoolName || collegeName || instituteName || '',
      institutionType: studentType || '',
      classOrYear: classDetails?.name || ''
    };

    res.status(200).json({
      message: 'Signup/Profile completed successfully.',
      user: formattedUser
    });

  } catch (error) {
    console.error('Signup/Profile Error:', error);
    res.status(500).json({ message: error.message });
  }
};


exports.getOrganizationUserProfile = async (req, res) => {
  try {
    const { fields } = req.query;

    // Fetch the first user in Organizationuser collection
    let user = await Organizationuser.findOne()
      .populate('countryId', 'name')
      .populate('stateId', 'name')
      .populate('cityId', 'name')
      .populate({
        path: 'updatedBy',
        select: 'email session startDate endDate endTime name role'
      });

    if (!user) {
      return res.status(404).json({ message: 'No users found.' });
    }

    // Fetch class details
    let classId = user.className;
    let classDetails = null;
    if (mongoose.Types.ObjectId.isValid(classId)) {
      classDetails =
        (await School.findById(classId)) ||
        (await College.findById(classId));
    }

    // Convert local paths to URLs
    const baseUrl = `${req.protocol}://${req.get('host')}`.replace('http://', 'https://');
    if (user.aadharCard && fs.existsSync(user.aadharCard)) {
      user.aadharCard = `${baseUrl}/uploads/${path.basename(user.aadharCard)}`;
    }
    if (user.marksheet && fs.existsSync(user.marksheet)) {
      user.marksheet = `${baseUrl}/uploads/${path.basename(user.marksheet)}`;
    }

    // Handle invalid classDetails
    if (!classDetails || classDetails.price == null) {
      classId = null;
      user.className = null;
    }

    // Format response
    const formattedUser = {
      ...user._doc,
      status: user.status,
      className: classId,
      country: user.countryId?.name || '',
      state: user.stateId?.name || '',
      city: user.cityId?.name || '',
      institutionName: user.schoolName || user.collegeName || user.instituteName || '',
      institutionType: user.studentType || '',
      updatedBy: user.updatedBy || null,
      classOrYear: classDetails?.name || ''
    };

    // Apply fields filter if requested
    let responseUser = formattedUser;
    if (fields) {
      const requestedFields = fields.split(',');
      const limited = {};
      requestedFields.forEach(f => {
        if (formattedUser.hasOwnProperty(f)) limited[f] = formattedUser[f];
      });
      responseUser = limited;
    }

    return res.status(200).json({
      message: 'Organization user profile fetched successfully.',
      user: responseUser
    });

  } catch (error) {
    console.error('Get OrganizationUser Profile Error:', error);
    return res.status(500).json({ message: error.message });
  }
};
