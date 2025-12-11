// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const connectDB = require('./config/db');

const http = require('http');
const { Server } = require('socket.io');
const moment = require('moment-timezone');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const cron = require('node-cron');

// MODELS
const User = require('./models/User');
const Schoolerexam = require('./models/Schoolerexam');
const MarkingSetting = require('./models/markingSetting');
const ExamUserStatus = require('./models/ExamUserStatus');

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
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});
global.io = io;

// In-memory store for exam start timestamps
const examStartTimes = {};

// ------------------------------
// AUTH MIDDLEWARE FOR SOCKET
// ------------------------------
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication error: Token required'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'testsecret');
    const user = await User.findById(decoded.id);
    if (!user) return next(new Error('Authentication error: User not found'));
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Authentication error: Invalid token'));
  }
});

// -------------------------------------------
// HELPER: CHECK IF EXAM FULLY COMPLETED
// -------------------------------------------
async function isExamFullyCompleted(examId) {
  const statuses = await ExamUserStatus.find({ examId }).lean();
  return statuses.every(
    (s) => s.statusManage === 'Completed' || s.statusManage === 'Not Eligible'
  );
}

// -------------------------------------------
// HELPER: FINAL RANK CALCULATION
// -------------------------------------------
async function calculateFinalRank(examId) {
  const users = await ExamUserStatus.find({ examId }).sort({ totalMarks: -1 }).lean();
  let rank = 1;
  for (const u of users) {
    await ExamUserStatus.updateOne({ _id: u._id }, { $set: { rank } });
    rank++;
  }
}

// ------------------------------
// SOCKET EVENTS
// ------------------------------
io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.user?.firstName || 'Unknown'} (${socket.id})`);

  socket.selectedCategory = null;

  socket.on('joinExamCategory', (data) => {
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

  socket.on('getExamTime', async (examId) => {
    try {
      if (!examId || !mongoose.Types.ObjectId.isValid(examId)) {
        return socket.emit('examTimeResponse', { error: 'Invalid examId' });
      }

      const exam = await Schoolerexam.findById(examId).select('ExamTime').lean();
      if (!exam) return socket.emit('examTimeResponse', { error: 'Exam not found' });

      const examDuration = exam.ExamTime || 0;

      if (!examStartTimes[examId]) examStartTimes[examId] = Date.now();

      let elapsedSeconds = Math.floor((Date.now() - examStartTimes[examId]) / 1000);
      let remainingSeconds = examDuration * 60 - elapsedSeconds;
      if (remainingSeconds < 0) remainingSeconds = 0;

      socket.emit('examTimeResponse', {
        examId,
        ExamTime: examDuration,
        remainingSeconds,
      });

      const interval = setInterval(() => {
        if (remainingSeconds <= 0) {
          socket.emit('examCountdown', { examId, remainingSeconds: 0 });
          clearInterval(interval);
          return;
        }
        remainingSeconds--;
        socket.emit('examCountdown', { examId, remainingSeconds });
      }, 1000);

      socket.on('disconnect', () => clearInterval(interval));
    } catch (err) {
      socket.emit('examTimeResponse', { error: 'Internal server error' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: (${socket.id})`);
  });
});

cron.schedule('*/1 * * * * *', async () => {
  try {
    const markingSetting = await MarkingSetting.findOne().lean();
    const bufferTime = markingSetting?.bufferTime ? parseInt(markingSetting.bufferTime) : 0;

    if (!global.io) return;

    for (const [socketId, socket] of io.sockets.sockets) {
      if (!socket.user) continue;

      if (!socket.activeExams) socket.activeExams = new Set();

      const filterQuery = { userId: socket.user._id };

      if (socket.selectedCategory) {
        try {
          filterQuery['category._id'] = new mongoose.Types.ObjectId(socket.selectedCategory);
        } catch (e) {}
      }

      const userExamStatuses = await ExamUserStatus.find(filterQuery)
        .populate('examId', 'ScheduleTime ScheduleDate ExamTime publish examDate')
        .sort({ 'examId.examDate': 1, 'examId.ScheduleTime': 1 })
        .lean();

      const now = moment().tz("Asia/Kolkata");

      const userExams = [];
      let hasFailed = false;

      for (const status of userExamStatuses) {
        const exam = status.examId;
        if (!exam || !exam.publish) continue;

        const examStartTime = moment.tz(
          `${moment(exam.examDate).format("YYYY-MM-DD")} ${exam.ScheduleTime}`,
          "YYYY-MM-DD HH:mm:ss",
          "Asia/Kolkata"
        ).add(bufferTime, "minutes");

        const examEndTime = examStartTime.clone().add(exam.ExamTime || 0, "minutes");

        let computedStatus = "Schedule";
        if (now.isBefore(examStartTime)) {
          computedStatus = "Schedule";
        } else if (now.isSameOrAfter(examStartTime) && now.isBefore(examEndTime)) {
          computedStatus = "Ongoing";
        } else if (now.isSameOrAfter(examEndTime)) {
          computedStatus = "Completed";
        }

        // FAILED chain rule
        let statusManage = status.statusManage;
        let result = status.result;

        if (hasFailed && (computedStatus === "Schedule" || computedStatus === "Ongoing")) {
          statusManage = "Not Eligible";
          await ExamUserStatus.updateOne(
            { _id: status._id },
            { $set: { statusManage, result: null } }
          );
        } else {
          if (computedStatus !== statusManage) {
            statusManage = computedStatus;
            await ExamUserStatus.updateOne(
              { _id: status._id },
              { $set: { statusManage } }
            );
          }

          if (
            statusManage === "Completed" &&
            (!status.result || status.result === null) &&
            (status.attemptedQuestions === 0 || !status.haveStarted)
          ) {
            result = "Not Attempt";
            await ExamUserStatus.updateOne(
              { _id: status._id },
              { $set: { result } }
            );
          }

          if (status.result === "failed") hasFailed = true;
        }

        // EXAM COMPLETED → STOP REALTIME EMIT
        if (statusManage === "Completed") {
          socket.activeExams.delete(exam._id.toString());
        }

        // EXAM NOT STARTED → NO EMIT
        if (computedStatus === "Schedule") {
          continue;
        }

        // EXAM ONGOING → ONLY NOW EMIT
        if (computedStatus === "Ongoing") {
          socket.activeExams.add(exam._id.toString());
        }

        const examObj = {
          examId: exam._id,
          ScheduleTime: exam.ScheduleTime,
          ScheduleDate: exam.ScheduleDate,
          statusManage,
          bufferTime,
          updatedScheduleTime: examStartTime.format("HH:mm:ss"),
        };

        if (statusManage === "Completed") {
          examObj.result = result;
          const examDone = await isExamFullyCompleted(exam._id);
          if (examDone) {
            examObj.rank = status.rank || null;
            if (!status.rank) {
              await calculateFinalRank(exam._id);
              const latest = await ExamUserStatus.findById(status._id).lean();
              examObj.rank = latest?.rank || null;
            }
          }
        }

        userExams.push(examObj);
      }

      // ONLY SEND IF ANY EXAM IS ACTIVE
      if (userExams.length) {
        socket.emit("examStatusUpdate", userExams);
      }
    }
  } catch (err) {
    console.error("CRON ERROR:", err);
  }
});


// --------------------------------------------------------------------
// START SERVER
// --------------------------------------------------------------------
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
