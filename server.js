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

global.io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

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

      const bufferTime = 0;
      const examDate = moment(exam.examDate)
        .tz("Asia/Kolkata")
        .format("YYYY-MM-DD");

      const startTime = moment.tz(
        `${examDate} ${exam.ScheduleTime}`,
        "YYYY-MM-DD HH:mm:ss",
        "Asia/Kolkata"
      ).add(bufferTime, "minutes");

      const examDuration = exam.ExamTime || 0;
      const endTime = startTime.clone().add(examDuration, "minutes");

      socket.emit("examTimeResponse", {
        examId,
        ExamTime: examDuration
      });

      const interval = setInterval(() => {
        const now = moment().tz("Asia/Kolkata");
        let remainingSec = endTime.diff(now, "seconds");

        if (remainingSec <= 0) {
          remainingSec = 0;
          clearInterval(interval);
        }

        socket.emit("examCountdown", {
          examId,
          remainingSeconds: remainingSec
        });
      }, 1000);

      socket.on("disconnect", () => {
        clearInterval(interval);
        console.log("Client disconnected:", socket.id);
      });

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
//  CRON JOB – AUTO STATUS UPDATE (EVERY 30 SECONDS)
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
      const ongoingEnd = ongoingStart.clone().add(exam.ExamTime, "minutes");

      const now = moment().tz("Asia/Kolkata");

      let statusManage = "Schedule";

      if (now.isBefore(ongoingStart)) statusManage = "Schedule";
      else if (now.isSameOrAfter(ongoingStart) && now.isBefore(ongoingEnd)) statusManage = "Ongoing";
      else if (now.isSameOrAfter(ongoingEnd)) statusManage = "Completed";

      // NEVER overwrite completed
      await ExamUserStatus.updateMany(
        {
          examId: exam._id,
          statusManage: { $ne: "Completed" }
        },
        { $set: { statusManage } }
      );

      const allUsers = await ExamUserStatus.find({ examId: exam._id }).lean();

      for (const user of allUsers) {
        if (user.result) continue;

        let userResult = null;

        if (statusManage === "Completed" && user.finalScore === null) {
          userResult = "Not Attempt";
        }

        if (userResult) {
          await ExamUserStatus.updateOne(
            { _id: user._id },
            { $set: { result: userResult } }
          );
        }
      }

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
}, 10000);

// ------------------------------------------------------------------
//  START SERVER
// ------------------------------------------------------------------
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
