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
const jwt = require('jsonwebtoken');

// MODELS
const User = require("./models/User");
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

// MIDDLEWARE
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
const examStartTimes = {};

// ------------------------------
// AUTH MIDDLEWARE FOR SOCKET
// ------------------------------
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("Authentication error: Token required"));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "testsecret");
    const user = await User.findById(decoded.id);
    if (!user) return next(new Error("Authentication error: User not found"));
    socket.user = user;
    next();
  } catch (err) {
    next(new Error("Authentication error: Invalid token"));
  }
});

// -------------------------------------------
// HELPER: CHECK IF EXAM FULLY COMPLETED
// -------------------------------------------
async function isExamFullyCompleted(examId) {
  const statuses = await ExamUserStatus.find({ examId }).lean();
  return statuses.every(s =>
    s.statusManage === "Completed" ||
    s.statusManage === "Not Eligible"
  );
}

// -------------------------------------------
// HELPER: FINAL RANK CALCULATION
// -------------------------------------------
async function calculateFinalRank(examId) {
  const users = await ExamUserStatus.find({ examId })
    .sort({ totalMarks: -1 })
    .lean();

  let rank = 1;
  for (const u of users) {
    await ExamUserStatus.updateOne(
      { _id: u._id },
      { $set: { rank } }
    );
    rank++;
  }
}

// ------------------------------
// SOCKET EVENTS
// ------------------------------
global.io.on("connection", (socket) => {
  console.log(`✅ User connected: ${socket.user?.firstName || 'Unknown'} (${socket.id})`);

  socket.selectedCategory = null;

  socket.on("joinExamCategory", (data) => {
    try {
      const catId = data?.categoryId;
      if (catId && mongoose.Types.ObjectId.isValid(catId)) {
        socket.selectedCategory = catId.toString();
      } else {
        socket.selectedCategory = null;
      }
    } catch (err) {
      socket.selectedCategory = null;
    }
  });

  socket.on("getExamTime", async (examId) => {
    try {
      if (!examId || !mongoose.Types.ObjectId.isValid(examId)) {
        return socket.emit("examTimeResponse", { error: "Invalid examId" });
      }

      const exam = await Schoolerexam.findById(examId).select("ExamTime").lean();
      if (!exam) return socket.emit("examTimeResponse", { error: "Exam not found" });

      const examDuration = exam.ExamTime || 0;

      if (!examStartTimes[examId]) examStartTimes[examId] = Date.now();

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
      socket.emit("examTimeResponse", { error: "Internal server error" });
    }
  });

  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: (${socket.id})`);
  });
});

// --------------------------------------------------------------------
// MAIN CRON — RANK/RESULT SHOW ONLY AFTER FULL EXAM COMPLETED
// --------------------------------------------------------------------
setInterval(async () => {
  try {
    const markingSetting = await MarkingSetting.findOne().lean();
    const bufferTime = markingSetting?.bufferTime ? parseInt(markingSetting.bufferTime) : 0;

    if (!global.io) return;

    for (const [socketId, socket] of global.io.sockets.sockets) {
      if (!socket.user) continue;

      const filterQuery = { userId: socket.user._id };

      if (socket.selectedCategory) {
        try {
          filterQuery["category._id"] = new mongoose.Types.ObjectId(socket.selectedCategory);
        } catch (e) {}
      }

      const userExamStatuses = await ExamUserStatus.find(filterQuery)
        .populate('examId', 'ScheduleTime ScheduleDate ExamTime publish examDate')
        .sort({ 'examId.examDate': 1, 'examId.ScheduleTime': 1 })
        .lean();

      const userExams = [];
      let hasFailed = false;

      for (const status of userExamStatuses) {
        const exam = status.examId;
        if (!exam || !exam.publish) continue;

        let statusManage = "Schedule";
        let result = status.result;

        const examDateTime = moment.tz(
          `${moment(exam.examDate).format("YYYY-MM-DD")} ${exam.ScheduleTime}`,
          "YYYY-MM-DD HH:mm:ss",
          "Asia/Kolkata"
        );

        const ongoingStart = examDateTime.clone().add(bufferTime, "minutes");
        const ongoingEnd = ongoingStart.clone().add(exam.ExamTime || 0, "minutes");
        const now = moment().tz("Asia/Kolkata");

        if (hasFailed) {
          statusManage = "Not Eligible";
          result = null;
          await ExamUserStatus.updateOne({ _id: status._id }, { $set: { statusManage, result } });
        } else {
          if (now.isBefore(ongoingStart)) statusManage = "Schedule";
          else if (now.isSameOrAfter(ongoingStart) && now.isBefore(ongoingEnd)) statusManage = "Ongoing";
          else if (now.isSameOrAfter(ongoingEnd)) statusManage = "Completed";

          await ExamUserStatus.updateOne({ _id: status._id }, { $set: { statusManage } });

          if (statusManage === "Completed" && (!result || result === null)) {
            result = "Not Attempt";
            await ExamUserStatus.updateOne({ _id: status._id }, { $set: { result } });
          }

          if (status.result === "failed") hasFailed = true;
        }

        // -----------------------------
        // FINAL FIX: rank + result logic (only for current exam, do not touch old completed exams)
        // -----------------------------
        const examFullyCompleted = await isExamFullyCompleted(exam._id);

        let examObj = {
          examId: exam._id,
          statusManage,
          ScheduleTime: exam.ScheduleTime,
          ScheduleDate: exam.ScheduleDate,
          bufferTime,
          updatedScheduleTime: ongoingStart.format("HH:mm:ss"),
        };

        // STATUS-WISE RESULT + RANK LOGIC

        if (statusManage === "Schedule") {
          examObj.result = null;
          examObj.rank = null;
        }
        else if (statusManage === "Ongoing") {
          examObj.result = null;
          examObj.rank = null;
        }

        // else if (statusManage === "Completed") {
         
        //   examObj.result = result || status.result || null;

        //   if (examFullyCompleted) {
        //     examObj.rank = status.rank || null;
        //     if (!status.rank) {
        //       await calculateFinalRank(exam._id);
        //       let updatedStatus = await ExamUserStatus.findById(status._id).lean();
        //       examObj.rank = updatedStatus?.rank || null;
        //     }
        //   } else {
        //     examObj.rank = null;
        //   }
        // }

else if (statusManage === "Completed") {

 
  examObj.result = result || status.result || null;

  if (examFullyCompleted) {

   
    setTimeout(async () => {
      let finalRank = status.rank;

     
      if (!status.rank) {
        await calculateFinalRank(exam._id);
        let updatedStatus = await ExamUserStatus.findById(status._id).lean();
        finalRank = updatedStatus?.rank || null;
      }

     
      examObj.rank = finalRank;
      examObj.result = result || status.result || null;

      
      socket.emit("examStatusUpdate", [examObj]);

    }, 5000); 

    
    continue;
  }

  
  examObj.rank = null;
}


        userExams.push(examObj);
      }

      if (userExams.length) {
        socket.emit("examStatusUpdate", userExams);
      }
    }
  } catch (err) {
    console.error("CRON ERROR:", err);
  }
}, 1000);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
