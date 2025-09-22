const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const bcrypt = require('bcryptjs');
const College = require('../models/college');
const School = require('../models/school');
const nodemailer = require('nodemailer');
const Organizationuser = require('../models/organizationuser');

// ---------------- REGISTER ----------------

exports.register = async (req, res) => {
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
      instituteName,
      className,
      status,
      updatedBy
    } = req.body;

    // ✅ Validation (Schema में सिर्फ email required है)
    if (!email) return res.status(400).json({ message: "Email address is required." });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    if (mobileNumber) {
      const mobileRegex = /^[0-9]{10}$/;
      if (!mobileRegex.test(mobileNumber)) {
        return res.status(400).json({
          message: "Mobile Number must be exactly 10 digits and contain only numbers."
        });
      }
    }

    const existingUser = await Organizationuser.findOne({
      $or: [{ email }, { mobileNumber }],
    });
    if (existingUser) {
      return res.status(409).json({ message: "User with this email or mobile already exists." });
    }

    // ✅ Prepare user data (sirf schema ke fields)
    let newUserData = {
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
      instituteName,
      className: mongoose.Types.ObjectId.isValid(className) ? className : undefined,
     
      status,
      updatedBy: mongoose.Types.ObjectId.isValid(updatedBy) ? updatedBy : undefined,
    };

    // ✅ File uploads
    if (req.files?.aadharCard?.[0]) {
      newUserData.aadharCard = req.files.aadharCard[0].path;
    }
    if (req.files?.marksheet?.[0]) {
      newUserData.marksheet = req.files.marksheet[0].path;
    }

    // ✅ Save user
    const newUser = new Organizationuser(newUserData);
    await newUser.save();

    // ✅ Token (अगर login की तरह चाहिए तो)
    const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    // ✅ File path convert to url
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    if (newUser.aadharCard && fs.existsSync(newUser.aadharCard)) {
      newUser.aadharCard = `${baseUrl}/uploads/${path.basename(newUser.aadharCard)}`;
    }
    if (newUser.marksheet && fs.existsSync(newUser.marksheet)) {
      newUser.marksheet = `${baseUrl}/uploads/${path.basename(newUser.marksheet)}`;
    }

    res.status(201).json({
      message: "Registered successfully.",
      token,
      user: newUser,
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Server error during register.", error: error.message });
  }
};
