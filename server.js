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
// SOCKET.IO
// ------------------------------------------------------------------
const server = http.createServer(app);
global.io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// In-memory store for exam start timestamps
const examStartTimes = {};

// SOCKET EVENTS
global.io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  // Optional: store userId in socket if sent from client
  socket.on("registerUser", (userId) => {
    socket.userId = userId;
  });

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

      const examDuration = exam.ExamTime || 0;

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
//  CRON JOB (EVERY 10 SEC) - SEND EXACT DB DATA
// ------------------------------------------------------------------
setInterval(async () => {
  try {
    const exams = await Schoolerexam.find({ publish: true });

    // Fetch all ExamUserStatus at once
    const allStatuses = await ExamUserStatus.find({}).lean();

    // Map userId → exam data array
    const perUserData = {};

    for (const status of allStatuses) {
      const exam = exams.find(e => e._id.toString() === status.examId.toString());
      if (!exam) continue;

      if (!perUserData[status.userId]) perUserData[status.userId] = [];

      perUserData[status.userId].push({
        examId: exam._id,
        statusManage: status.statusManage,
        ScheduleTime: exam.ScheduleTime,
        ScheduleDate: exam.ScheduleDate,
        bufferTime: 0,
        updatedScheduleTime: exam.ScheduleTime,
        result: status.result
      });
    }

    // Emit to each connected user
    for (let [socketId, socket] of global.io.sockets.sockets) {
      if (socket.userId && perUserData[socket.userId]) {
        socket.emit("examStatusUpdate", perUserData[socket.userId]);
        console.log("Sent DB data to user:", socket.userId);
      }
    }

  } catch (err) {
    console.error("CRON ERROR:", err);
  }
}, 10000);

// ------------------------------------------------------------------
//  START SERVER
// ------------------------------------------------------------------
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
