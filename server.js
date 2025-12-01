const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const connectDB = require('./config/db');

const http = require("http");
const { Server } = require("socket.io");
const moment = require("moment-timezone");

// MODELS
const Schoolerexam = require("./models/Schoolerexam");
const MarkingSetting = require("./models/markingSetting");
const ExamUserStatus = require("./models/ExamUserStatus");

const app = express();
const PORT = process.env.PORT || 5000;

// DB CONNECT
connectDB();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ROUTES
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/v1', require('./routes/locationRoutes'));
app.use('/api/v1', require('./routes/learningRoutes'));
app.use('/api/v1', require('./routes/assignRoutes'));
app.use('/api/v1', require('./routes/topicRoutes'));
app.use('/api/v1', require('./routes/experiencePointRoutes'));
app.use('/api/v1', require('./routes/markingSettingRoutes'));
app.use('/api/v1', require('./routes/practicesRoutes'));
app.use('/api/v1', require('./routes/schoolRoutes'));
app.use('/api/v1', require('./routes/quoteRoutes'));
app.use('/api/v1', require('./routes/userRoutes'));
app.use('/api/v1', require('./routes/SchoolercategoryRoutes'));
app.use('/api/v1', require('./routes/SchoolerexamRoutes'));
app.use('/api/v1', require('./routes/userexamGroupRoutes'));
app.use('/api/v1', require('./routes/organizationSignRoutes'));
app.use('/api/v1', require('./routes/classSeatRoutes'));

// SOCKET.IO SETUP
const server = http.createServer(app);
global.io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

global.io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// ------------------------------------------------------------------
// 🔥 CRON JOB – AUTO STATUS UPDATE (EVERY 30 SECONDS)
// ------------------------------------------------------------------
setInterval(async () => {
  try {
    const exams = await Schoolerexam.find({ publish: true });

    const socketArray = [];

    for (const exam of exams) {
      const markingSetting = await MarkingSetting.findOne({
        className: exam.className,
      }).lean();

      const bufferTime = markingSetting?.bufferTime
        ? parseInt(markingSetting.bufferTime)
        : 0;

      // Correct exam date
      const examDate = moment(exam.examDate)
        .tz("Asia/Kolkata")
        .format("YYYY-MM-DD");

      const scheduleDateTime = moment.tz(
        `${examDate} ${exam.ScheduleTime}`,
        "YYYY-MM-DD HH:mm:ss",
        "Asia/Kolkata"
      );

      // Add bufferTime for Ongoing start
      const ongoingStart = scheduleDateTime.clone().add(bufferTime, "minutes");

      // End after exam duration
      const ongoingEnd = ongoingStart.clone().add(exam.ExamTime, "minutes");

      const now = moment().tz("Asia/Kolkata");

      let statusManage = "Schedule";

      if (now.isBefore(ongoingStart)) {
        statusManage = "Schedule";
      } else if (now.isSameOrAfter(ongoingStart) && now.isBefore(ongoingEnd)) {
        statusManage = "Ongoing";
      } else if (now.isSameOrAfter(ongoingEnd)) {
        statusManage = "Completed";
      }

      // UPDATE STATUS IN DB
      await ExamUserStatus.updateMany(
        { examId: exam._id },
        { $set: { statusManage } }
      );

      socketArray.push({
        examId: exam._id,
        statusManage,
        ScheduleTime: exam.ScheduleTime,
        ScheduleDate: exam.ScheduleDate,
        bufferTime,
        updatedScheduleTime: ongoingStart.format("HH:mm:ss"),
      });
    }

    if (socketArray.length && global.io) {
      global.io.emit("examStatusUpdate", socketArray);
      console.log("📡 CRON EMIT:", socketArray);
    }
  } catch (err) {
    console.error("CRON ERROR:", err);
  }
}, 30000);

// ------------------------------------------------------------------
// 🚀 START SERVER
// ------------------------------------------------------------------
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
