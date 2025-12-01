const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const connectDB = require('./config/db');

const http = require("http");
const { Server } = require("socket.io");
const moment = require("moment-timezone");

// MODELS REQUIRED FOR CRON
const Schoolerexam = require("./models/Schoolerexam");
const MarkingSetting = require("./models/markingSetting");
const ExamUserStatus = require("./models/ExamUserStatus");


const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// STATIC UPLOADS
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

    let socketArray = [];

    for (const exam of exams) {
      const markingSetting = await MarkingSetting.findOne({
        className: exam.className,
      }).lean();

      const bufferTime = markingSetting?.bufferTime
        ? parseInt(markingSetting.bufferTime)
        : 0;

      const examDate = moment(exam.slotDate || exam.createdAt)
        .tz("Asia/Kolkata")
        .format("YYYY-MM-DD");

      const scheduleDateTime = moment.tz(
        `${examDate} ${exam.ScheduleTime}`,
        "YYYY-MM-DD HH:mm:ss",
        "Asia/Kolkata"
      );

      const scheduleTime = scheduleDateTime.valueOf();
      const startTime = scheduleTime + bufferTime * 60000;
      const endTime = startTime + exam.ExamTime * 60000;
      const now = moment().tz("Asia/Kolkata").valueOf();

      let statusManage = "To Be Schedule";

      if (now < startTime) {
        statusManage = "Schedule";
      } else if (now >= startTime && now <= endTime) {
        statusManage = "Ongoing";
      } else if (now > endTime) {
        statusManage = "Completed";
      }

      // UPDATE STATUS IN DB FOR ALL USERS
      await ExamUserStatus.updateMany(
        { examId: exam._id },
        { $set: { statusManage } }
      );

      socketArray.push({
        examId: exam._id,
        statusManage,
        ScheduleDate: exam.ScheduleDate || "",      
        ScheduleTime: exam.ScheduleTime || "" 
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
