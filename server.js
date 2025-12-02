const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const connectDB = require('./config/db');

const http = require("http");
const { Server } = require("socket.io");
const moment = require("moment-timezone");
const mongoose = require('mongoose');

// MODELS
const Schoolerexam = require("./models/Schoolerexam");
const MarkingSetting = require("./models/markingSetting");
const ExamUserStatus = require("./models/ExamUserStatus");

// ROUTES
const authRoutes = require('./routes/authRoutes');
const locationRoutes = require('./routes/locationRoutes');
const learningRoutes = require('./routes/learningRoutes');
const assignRoutes = require('./routes/assignRoutes');
const topicRoutes = require('./routes/topicRoutes');
const experiencePointRoutes = require('./routes/experiencePointRoutes');
const markingSettingRoutes = require('./routes/markingSettingRoutes');
const practicesRoutes = require('./routes/practicesRoutes');
const schoolRoutes = require('./routes/schoolRoutes');
const quoteRoutes = require('./routes/quoteRoutes');
const userRoutes = require('./routes/userRoutes');
const SchoolercategoryRoutes = require('./routes/SchoolercategoryRoutes');
const SchoolerexamRoutes = require('./routes/SchoolerexamRoutes');
const userexamGroupRoutes = require('./routes/userexamGroupRoutes');
const organizationSignRoutes = require('./routes/organizationSignRoutes');
const classSeatRoutes = require('./routes/classSeatRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// DB CONNECT
connectDB();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ROUTES
app.use('/api/auth', authRoutes);
app.use('/api/v1', locationRoutes);
app.use('/api/v1', learningRoutes);
app.use('/api/v1', assignRoutes);
app.use('/api/v1', topicRoutes);
app.use('/api/v1', experiencePointRoutes);
app.use('/api/v1', markingSettingRoutes);
app.use('/api/v1', practicesRoutes);
app.use('/api/v1', schoolRoutes);
app.use('/api/v1', quoteRoutes);
app.use('/api/v1', userRoutes);
app.use('/api/v1', SchoolercategoryRoutes);
app.use('/api/v1', SchoolerexamRoutes);
app.use('/api/v1', userexamGroupRoutes);
app.use('/api/v1', organizationSignRoutes);
app.use('/api/v1', classSeatRoutes);

// -------------------------------------
// SOCKET.IO SETUP
// -------------------------------------
const server = http.createServer(app);
global.io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});


// -------------------------------------
// SOCKET EVENTS
// -------------------------------------
global.io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // =======================================================
  // FIXED getExamTime EVENT (NO RESTART ON PAGE RELOAD)
  // =======================================================
  socket.on("getExamTime", async (examId) => {
    try {
      if (!examId || !mongoose.Types.ObjectId.isValid(examId)) {
        return socket.emit("examTimeResponse", { error: "Invalid examId" });
      }

      const exam = await Schoolerexam.findById(examId)
        .select("ExamTime ScheduleTime examDate")
        .lean();

      if (!exam) {
        return socket.emit("examTimeResponse", { error: "Exam not found" });
      }

      const examDuration = exam.ExamTime || 0; // minutes

      // ------------------------------
      // FIXED EXAM START TIME
      // ------------------------------
      const examDate = moment(exam.examDate).tz("Asia/Kolkata").format("YYYY-MM-DD");

      const startTime = moment.tz(
        `${examDate} ${exam.ScheduleTime}`,
        "YYYY-MM-DD HH:mm:ss",
        "Asia/Kolkata"
      );

      const endTime = startTime.clone().add(examDuration, "minutes");

      // ------------------------------
      // CALCULATE REAL REMAINING TIME
      // ------------------------------
      const now = moment().tz("Asia/Kolkata");
      let remainingSeconds = Math.max(0, endTime.diff(now, "seconds"));

      // Send initial response
      socket.emit("examTimeResponse", {
        examId,
        ExamTime: examDuration,
        remainingSeconds
      });

      // ------------------------------
      // SEND COUNTDOWN EVERY SECOND
      // ------------------------------
      const interval = setInterval(() => {
        const now = moment().tz("Asia/Kolkata");
        remainingSeconds = Math.max(0, endTime.diff(now, "seconds"));

        socket.emit("examCountdown", {
          examId,
          remainingSeconds
        });

        if (remainingSeconds <= 0) {
          clearInterval(interval);
        }
      }, 1000);

      socket.on("disconnect", () => clearInterval(interval));

    } catch (err) {
      console.error("Error in getExamTime:", err);
      socket.emit("examTimeResponse", { error: "Internal server error" });
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});



// -----------------------------------------------------------
// CRON JOB EVERY 10 SEC
// -----------------------------------------------------------
setInterval(async () => {
  try {
    const exams = await Schoolerexam.find({ publish: true });

    const markingSetting = await MarkingSetting.findOne().lean();
    const bufferTime = markingSetting?.bufferTime ? parseInt(markingSetting.bufferTime) : 0;

    const socketArray = [];

    for (const exam of exams) {

      const userStatuses = await ExamUserStatus.find({ examId: exam._id }).lean();
      const alreadyCompleted = userStatuses.some(
        u => u.statusManage === "Completed" && u.result !== null
      );

      if (alreadyCompleted) {
        socketArray.push({
          examId: exam._id,
          statusManage: "Completed",
          ScheduleTime: exam.ScheduleTime,
          ScheduleDate: exam.ScheduleDate,
          bufferTime,
          updatedScheduleTime: exam.ScheduleTime,
          result: userStatuses[0]?.result || "Completed"
        });

        continue;
      }

      const examDate = moment(exam.examDate).tz("Asia/Kolkata").format("YYYY-MM-DD");

      const scheduleDateTime = moment.tz(
        `${examDate} ${exam.ScheduleTime}`,
        "YYYY-MM-DD HH:mm:ss",
        "Asia/Kolkata"
      );

      const ongoingStart = scheduleDateTime.clone().add(bufferTime, "minutes");
      const ongoingEnd = ongoingStart.clone().add(exam.ExamTime, "minutes");

      const now = moment().tz("Asia/Kolkata");

      let statusManage = "Schedule";

      if (now.isBefore(ongoingStart)) statusManage = "Schedule";
      else if (now.isSameOrAfter(ongoingStart) && now.isBefore(ongoingEnd)) 
        statusManage = "Ongoing";
      else if (now.isSameOrAfter(ongoingEnd)) statusManage = "Completed";

      await ExamUserStatus.updateMany(
        { examId: exam._id },
        { $set: { statusManage } }
      );

      const allUsers = await ExamUserStatus.find({ examId: exam._id }).lean();
      const anyAttempt = allUsers.some(u => u.finalScore !== null);

      let examResult = null;
      if (statusManage === "Completed") {
        examResult = anyAttempt ? "Completed" : "Not Attempt";
      }

      socketArray.push({
        examId: exam._id,
        statusManage,
        ScheduleTime: exam.ScheduleTime,
        ScheduleDate: exam.ScheduleDate,
        bufferTime,
        updatedScheduleTime: ongoingStart.format("HH:mm:ss"),
        result: examResult,
      });
    }

    if (socketArray.length && global.io) {
      global.io.emit("examStatusUpdate", socketArray);
      console.log("📡 CRON EMIT:", socketArray);
    }

  } catch (err) {
    console.error("CRON ERROR:", err);
  }
}, 10000);


// START SERVER
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
