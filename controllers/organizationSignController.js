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


exports.resetPassword = async (req, res) => {
  try {
    const { password, newPassword } = req.body;
    const token = req.headers.authorization?.split(" ")[1]; 

    if (!token) {
      return res.status(401).json({ message: "Authorization token required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || "SECRET_KEY");
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const user = await OrganizationSign.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (password !== newPassword) {
      return res.status(400).json({ message: "Password and New Password must be same" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    await user.save();

    res.json({
      message: "Password reset successfully. Please login with your new password."
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// exports.organizationUser = async (req, res) => {
//   try {
//     const {
//       firstName,
//       middleName,
//       lastName,
//       mobileNumber,
//       email,
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

//     // ✅ Only email is required
//     if (!email) return res.status(400).json({ message: 'Email address can’t remain empty.' });

//     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
//     if (!emailRegex.test(email)) return res.status(400).json({ message: 'Please enter a valid email address.' });

//     // Check existing user
//     let user = await Organizationuser.findOne({ email });

//     const updatedFields = {
//       firstName,
//       middleName,
//       lastName,
//       mobileNumber,
//       email,
//       countryId: mongoose.Types.ObjectId.isValid(countryId) ? countryId : undefined,
//       stateId: mongoose.Types.ObjectId.isValid(stateId) ? stateId : undefined,
//       cityId: mongoose.Types.ObjectId.isValid(cityId) ? cityId : undefined,
//       pincode,
//       studentType,
//       schoolName,
//       instituteName,
//       collegeName,
//       className: mongoose.Types.ObjectId.isValid(className) ? className : undefined
//     };

//     if (req.files?.aadharCard?.[0]) updatedFields.aadharCard = req.files.aadharCard[0].path;
//     if (req.files?.marksheet?.[0]) updatedFields.marksheet = req.files.marksheet[0].path;

//     if (user) {
//       // Update existing user
//       user = await Organizationuser.findByIdAndUpdate(user._id, updatedFields, { new: true });
//     } else {
//       // Create new user
//       user = new Organizationuser(updatedFields);
//       await user.save();
//     }

//     await user.populate('countryId stateId cityId');

//     // Get class details
//     let classDetails = null;
//     if (mongoose.Types.ObjectId.isValid(className)) {
//       classDetails =
//         (await School.findById(className)) ||
//         (await College.findById(className)) ||
//         (await Institute.findById(className));
//     }

//     const baseUrl = `${req.protocol}://${req.get('host')}`;
//     if (user.aadharCard && fs.existsSync(user.aadharCard)) user.aadharCard = `${baseUrl}/uploads/${path.basename(user.aadharCard)}`;
//     if (user.marksheet && fs.existsSync(user.marksheet)) user.marksheet = `${baseUrl}/uploads/${path.basename(user.marksheet)}`;

//     const formattedUser = {
//       ...user._doc,
//       country: user.countryId?.name || '',
//       state: user.stateId?.name || '',
//       city: user.cityId?.name || '',
//       institutionName: schoolName || collegeName || instituteName || '',
//       institutionType: studentType || '',
//       classOrYear: classDetails?.name || ''
//     };

//     res.status(200).json({
//       message: 'Signup/Profile completed successfully.',
//       user: formattedUser
//     });

//   } catch (error) {
//     console.error('Signup/Profile Error:', error);
//     res.status(500).json({ message: error.message });
//   }
// };



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
      // ✅ Update existing user (set updatedBy)
      updatedFields.updatedBy = req.user._id;  // from token
      user = await Organizationuser.findByIdAndUpdate(user._id, updatedFields, { new: true });
    } else {
      // ✅ Create new user (set createdBy)
      user = new Organizationuser({
        ...updatedFields,
        createdBy: req.user._id  // from token
      });
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
      classOrYear: classDetails?.name || '',
      createdBy: user.createdBy || null, 
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


// exports.getOrganizationUserProfile = async (req, res) => {
//   try {
//     const { fields, className } = req.query;

//     // Base query
//     let query = { createdBy: req.user._id };

//     // If className filter is given, add it
//     if (className && mongoose.Types.ObjectId.isValid(className)) {
//       query.className = className;
//     }

//     let users = await Organizationuser.find(query)
//       .populate('countryId', 'name')
//       .populate('stateId', 'name')
//       .populate('cityId', 'name')
//       .populate({
//         path: 'updatedBy',
//         select: 'email session startDate endDate endTime name role'
//       });

//     if (!users || users.length === 0) {
//       return res.status(404).json({ message: 'No users found for this token.' });
//     }

//     const baseUrl = `${req.protocol}://${req.get('host')}`.replace('http://', 'https://');

//     const formattedUsers = await Promise.all(
//       users.map(async (user) => {
//         let classId = user.className;
//         let classDetails = null;
//         if (mongoose.Types.ObjectId.isValid(classId)) {
//           classDetails =
//             (await School.findById(classId)) ||
//             (await College.findById(classId));
//             // (await Institute.findById(classId));
//         }

//         if (user.aadharCard && fs.existsSync(user.aadharCard)) {
//           user.aadharCard = `${baseUrl}/uploads/${path.basename(user.aadharCard)}`;
//         }
//         if (user.marksheet && fs.existsSync(user.marksheet)) {
//           user.marksheet = `${baseUrl}/uploads/${path.basename(user.marksheet)}`;
//         }

//         if (!classDetails || classDetails.price == null) {
//           classId = null;
//           user.className = null;
//         }

//         const formattedUser = {
//           ...user._doc,
//           status: user.status,
//           className: classId,
//           country: user.countryId?.name || '',
//           state: user.stateId?.name || '',
//           city: user.cityId?.name || '',
//           institutionName: user.schoolName || user.collegeName || user.instituteName || '',
//           institutionType: user.studentType || '',
//           updatedBy: user.updatedBy || null,
//           createdBy: user.createdBy || null,
//           classOrYear: classDetails?.name || ''
//         };

//         if (fields) {
//           const requestedFields = fields.split(',');
//           const limited = {};
//           requestedFields.forEach(f => {
//             if (formattedUser.hasOwnProperty(f)) limited[f] = formattedUser[f];
//           });
//           return limited;
//         }

//         return formattedUser;
//       })
//     );

//     return res.status(200).json({
//       message: 'Organization user profiles fetched successfully.',
//       users: formattedUsers
//     });

//   } catch (error) {
//     console.error('Get OrganizationUser Profile Error:', error);
//     return res.status(500).json({ message: error.message });
//   }
// };

exports.getOrganizationUserProfile = async (req, res) => {
  try {
    const { fields, className } = req.query;

    // Base query
    let query = { createdBy: req.user._id };

    // If className filter is given, add it
    if (className && mongoose.Types.ObjectId.isValid(className)) {
      query.className = className;
    }

    let users = await Organizationuser.find(query)
      .populate('countryId', 'name')
      .populate('stateId', 'name')
      .populate('cityId', 'name')
      .populate({
        path: 'updatedBy',
        select: 'email session startDate endDate endTime name role'
      });

    const baseUrl = `${req.protocol}://${req.get('host')}`.replace('http://', 'https://');

    // Format each user
    const formattedUsers = await Promise.all(
      users.map(async (user) => {
        let classId = user.className;
        let classDetails = null;

        if (mongoose.Types.ObjectId.isValid(classId)) {
          classDetails =
            (await School.findById(classId)) ||
            (await College.findById(classId));
          // (await Institute.findById(classId));
        }

        // Convert file paths to URLs
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

        // Format single user
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
          createdBy: user.createdBy || null, // raw ObjectId
          classOrYear: classDetails?.name || ''
        };

        // Apply fields filter if requested
        if (fields) {
          const requestedFields = fields.split(',');
          const limited = {};
          requestedFields.forEach(f => {
            if (formattedUser.hasOwnProperty(f)) limited[f] = formattedUser[f];
          });
          return limited;
        }

        return formattedUser;
      })
    );

    return res.status(200).json({
      message: 'Organization user profiles fetched successfully.',
      users: formattedUsers   
    });

  } catch (error) {
    console.error('Get OrganizationUser Profile Error:', error);
    return res.status(500).json({ message: error.message });
  }
};


exports.updateOrganizationUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      firstName,
      middleName,
      lastName,
      mobileNumber,
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

    let user = await Organizationuser.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const updatedFields = {
      firstName,
      middleName,
      lastName,
      mobileNumber,
      countryId: mongoose.Types.ObjectId.isValid(countryId) ? countryId : undefined,
      stateId: mongoose.Types.ObjectId.isValid(stateId) ? stateId : undefined,
      cityId: mongoose.Types.ObjectId.isValid(cityId) ? cityId : undefined,
      pincode,
      studentType,
      schoolName,
      instituteName,
      collegeName,
      className: mongoose.Types.ObjectId.isValid(className) ? className : undefined,
      updatedBy: req.user._id 
    };

    if (req.files?.aadharCard?.[0]) updatedFields.aadharCard = req.files.aadharCard[0].path;
    if (req.files?.marksheet?.[0]) updatedFields.marksheet = req.files.marksheet[0].path;

   
    delete updatedFields.email;

    user = await Organizationuser.findByIdAndUpdate(userId, updatedFields, { new: true })
      .populate('countryId stateId cityId');

    res.status(200).json({
      message: 'User updated successfully.',
      user
    });

  } catch (error) {
    console.error('Update User Error:', error);
    res.status(500).json({ message: error.message });
  }
};


exports.deleteOrganizationUser = async (req, res) => {
  try {
    const { userId } = req.params; // user _id to delete

    const user = await Organizationuser.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    await Organizationuser.findByIdAndDelete(userId);

    res.status(200).json({ message: 'User deleted successfully.' });

  } catch (error) {
    console.error('Delete User Error:', error);
    res.status(500).json({ message: error.message });
  }
};


exports.inviteUsers = async (req, res) => {
  try {
    const { emails } = req.body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ message: 'Please provide at least one email.' });
    }

    // Use your existing transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: 'noreply@shikshacart.com', 
        pass: 'xyrx ryad ondf jaum' 
      }
    });

    // Default message for invite
    const defaultMessage = `
Hello,

You have been invited to Update Data!

Please update your profile clicl Here: https://shikshacart.com/register

Best regards,
ShikshaCart Team
`;

    // Send invite to each email
    const sendEmailPromises = emails.map(email => {
      const mailOptions = {
        from: 'noreply@shikshacart.com',
        to: email,
        subject: 'You are invited to join ShikshaCart!',
        text: defaultMessage
      };
      return transporter.sendMail(mailOptions);
    });

    await Promise.all(sendEmailPromises);

    res.status(200).json({
      message: `Invitations sent successfully to ${emails.length} email(s).`
    });

  } catch (error) {
    console.error('Invite Users Error:', error);
    res.status(500).json({ message: error.message });
  }
};
