// server.js
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

// ------------------------------------------------------------------
// SOCKET.IO SETUP
// ------------------------------------------------------------------
const server = http.createServer(app);
global.io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// In-memory store for exam start timestamps
const examStartTimes = {}; // key: examId, value: timestamp in ms

// ------------------------------
// SOCKET EVENTS
// ------------------------------
global.io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("getExamTime", async (examId) => {
    try {
      if (!examId || !mongoose.Types.ObjectId.isValid(examId)) {
        return socket.emit("examTimeResponse", { error: "Invalid examId" });
      }

      const exam = await Schoolerexam.findById(examId)
        .select("ExamTime")
        .lean();

      if (!exam) {
        return socket.emit("examTimeResponse", { error: "Exam not found" });
      }

      const examDuration = exam.ExamTime || 0; // in minutes

      if (!examStartTimes[examId]) {
        examStartTimes[examId] = Date.now();
      }

      let elapsedSeconds = Math.floor((Date.now() - examStartTimes[examId]) / 1000);
      let remainingSeconds = examDuration * 60 - elapsedSeconds;

      if (remainingSeconds < 0) remainingSeconds = 0;

      socket.emit("examTimeResponse", {
        examId,
        ExamTime: examDuration,
        remainingSeconds
      });

      const interval = setInterval(() => {
        if (remainingSeconds <= 0) {
          socket.emit("examCountdown", { examId, remainingSeconds: 0 });
          clearInterval(interval);
          return;
        }

        remainingSeconds--;
        socket.emit("examCountdown", { examId, remainingSeconds });
      }, 1000);

      socket.on("disconnect", () => clearInterval(interval));

    } catch (err) {
      console.error("Error fetching ExamTime:", err);
      socket.emit("examTimeResponse", { error: "Internal server error" });
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// ------------------------------------------------------------------
// CRON JOB – AUTO STATUS UPDATE (EVERY 10 SECONDS)
// ------------------------------------------------------------------
// IMPORTANT FIXES:
// - CRON only updates statusManage (not result).
// - CRON will not overwrite records that are "Not Eligible".
// - For socket emit, CRON aggregates existing per-user results but DOES NOT mutate them.
// This prevents accidentally overwriting a correct per-user result.

// ------------------------------------------------------------------
// CRON JOB – AUTO STATUS UPDATE (EVERY 10 SECONDS)
// ------------------------------------------------------------------
setInterval(async () => {
  try {
    const exams = await Schoolerexam.find({ publish: true });
    const markingSetting = await MarkingSetting.findOne().lean();
    const bufferTime = markingSetting?.bufferTime ? parseInt(markingSetting.bufferTime) : 0;

    const socketArray = [];

    for (const exam of exams) {
      const examDate = moment(exam.examDate).tz("Asia/Kolkata").format("YYYY-MM-DD");
      const scheduleDateTime = moment.tz(
        `${examDate} ${exam.ScheduleTime}`,
        "YYYY-MM-DD HH:mm:ss",
        "Asia/Kolkata"
      );

      const ongoingStart = scheduleDateTime.clone().add(bufferTime, "minutes");
      const ongoingEnd = ongoingStart.clone().add(exam.ExamTime || 0, "minutes");
      const now = moment().tz("Asia/Kolkata");

      let statusManage = "Schedule";
      if (now.isBefore(ongoingStart)) statusManage = "Schedule";
      else if (now.isSameOrAfter(ongoingStart) && now.isBefore(ongoingEnd)) statusManage = "Ongoing";
      else if (now.isSameOrAfter(ongoingEnd)) statusManage = "Completed";

      // -----------------------------
      // 1️⃣ Update statusManage ONLY
      // -----------------------------
      await ExamUserStatus.updateMany(
        { examId: exam._id },
        { $set: { statusManage } } // result untouched
      );

      // -----------------------------
      // 2️⃣ Fetch fresh docs from DB before result check
      // -----------------------------
      const freshUsers = await ExamUserStatus.find({ examId: exam._id });

      if (statusManage === "Completed") {
        for (const user of freshUsers) {
          // ✅ Check DB field, never overwrite failed or passed
          if (user.result === "failed" || user.result === "passed") continue;

          if (user.result === null || user.result === undefined) {
            await ExamUserStatus.updateOne(
              { _id: user._id },
              { $set: { result: "Not Attempt" } }
            );
          }
        }
      }

      // -----------------------------
      // 3️⃣ Prepare socket emit
      // -----------------------------
      const refreshedStatuses = await ExamUserStatus.find({ examId: exam._id }).lean();
      const nonNullResults = refreshedStatuses
        .map(u => u.result)
        .filter(r => r !== null && r !== undefined);

      let examResultForEmit = null;
      const uniqueResults = [...new Set(nonNullResults)];
      if (uniqueResults.length === 1 && uniqueResults[0] != null) {
        examResultForEmit = uniqueResults[0];
      }

      socketArray.push({
        examId: exam._id,
        statusManage,
        ScheduleTime: exam.ScheduleTime,
        ScheduleDate: exam.ScheduleDate,
        bufferTime,
        updatedScheduleTime: ongoingStart.format("HH:mm:ss"),
        result: examResultForEmit
      });
    }

    // -----------------------------
    // 4️⃣ Socket emit
    // -----------------------------
    if (socketArray.length && global.io) {
      global.io.emit("examStatusUpdate", socketArray);
    }

  } catch (err) {
    console.error("CRON ERROR:", err);
  }
}, 10000);



// ------------------------------------------------------------------
// START SERVER
// ------------------------------------------------------------------
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
