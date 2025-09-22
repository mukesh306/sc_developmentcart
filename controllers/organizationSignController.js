const OrganizationSign = require('../models/organizationSign');
const bcrypt = require('bcryptjs');

const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

exports.createOrganizationSign = async (req, res) => {
  try {
    const { firstName, middleName, lastName, mobileNumber, email, password, studentType, instituteName, session } = req.body;

    if (!firstName || !lastName || !mobileNumber || !email || !password ) {
      return res.status(400).json({ message: 'Required fields are missing.' });
    }

    const existingUser = await OrganizationSign.findOne({ $or: [{ email }, { mobileNumber }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Email or Mobile number already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

   
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
      session,
      otp,
      otpExpires: Date.now() + 5 * 60 * 1000 
    });

    await orgSign.save();


    const mailOptions = {
      from: "noreply@shikshacart.com",
      to: email,
      subject: "Verify your email - OTP",
      text: `Your OTP for account verification is ${otp}. It will expire in 5 minutes.`
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ 
      message: "Organization Sign created successfully. OTP sent to email for verification.",
      userId: orgSign._id 
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
    const orgSign = await OrganizationSign.findById(req.params.id);
    if (!orgSign) return res.status(404).json({ message: 'Organization Sign not found' });
    res.json(orgSign);
  } catch (err) {
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

    const orgSign = await OrganizationSign.findById(req.params.id);
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
      // ⚡ अगर वही पुराना number है → कुछ मत करो, as it is रहने दो
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
      // ⚡ अगर वही पुराना email है → कुछ मत करो, as it is रहने दो
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
    res.json({ message: 'Organization Sign updated successfully', orgSign });

  } catch (err) {
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

    orgUser.VerifyEmail = "yes";

    orgUser.otpHistory.push({
      otp: orgUser.otp,
      status: "used"
    });
    orgUser.otp = null;
    orgUser.otpExpires = null;

    await orgUser.save();
 
    const token = jwt.sign(
      { id: orgUser._id, email: orgUser.email },
      "SECRET_KEY",
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