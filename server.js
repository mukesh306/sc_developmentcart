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
    } catch (err) {
      socket.emit('examTimeResponse', { error: 'Internal server error' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: (${socket.id})`);
  });
});

// --------------------------------------------------------------------
// OPTIMIZED CRON — STATUS STABLE (NO MID-ONGOING COMPLETED)
// --------------------------------------------------------------------
cron.schedule('*/15 * * * * *', async () => {
  try {
    const markingSetting = await MarkingSetting.findOne().lean();
    const bufferTime = markingSetting?.bufferTime
      ? parseInt(markingSetting.bufferTime)
      : 0;

    if (!global.io) return;

    for (const [socketId, socket] of io.sockets.sockets) {
      if (!socket.user) continue;

      const query = { userId: socket.user._id };
      if (socket.selectedCategory) query['category._id'] = socket.selectedCategory;

      const statuses = await ExamUserStatus.find(query)
        .populate('examId', 'examDate ScheduleTime ExamTime publish')
        .sort({ 'examId.examDate': 1, 'examId.ScheduleTime': 1 })
        .lean();

      const sendData = [];
      let hasFailed = false;

      for (const status of statuses) {
        const exam = status.examId;
        if (!exam || !exam.publish) continue;

        let dbStatus = status.statusManage;
        let dbResult = status.result;

        const examDate = moment(exam.examDate).format('YYYY-MM-DD');
        const examStart = moment.tz(
          `${examDate} ${exam.ScheduleTime}`,
          'YYYY-MM-DD HH:mm:ss',
          'Asia/Kolkata'
        );
        const ongoingStart = examStart.clone().add(bufferTime, 'minutes');
        const ongoingEnd = ongoingStart.clone().add(exam.ExamTime || 0, 'minutes');

        const now = moment().tz('Asia/Kolkata');

        let computedStatus = dbStatus;

        // ⚡ STABLE STATUS LOGIC
        if (dbStatus === 'Completed' || dbStatus === 'Not Eligible') {
          // once completed/not eligible, never revert
          computedStatus = dbStatus;
        } else if (hasFailed && (now.isBefore(ongoingEnd))) {
          // future exams after failure
          computedStatus = 'Not Eligible';
        } else if (now.isBefore(ongoingStart)) {
          computedStatus = 'Schedule';
        } else if (now.isSameOrAfter(ongoingStart) && now.isBefore(ongoingEnd)) {
          computedStatus = 'Ongoing';
        } else if (now.isSameOrAfter(ongoingEnd)) {
          computedStatus = 'Completed';
        }

        // update DB if changed
        if (dbStatus !== computedStatus) {
          await ExamUserStatus.updateOne({ _id: status._id }, { $set: { statusManage: computedStatus } });
          dbStatus = computedStatus;
        }

        // handle Not Attempt
        const neverAttempted =
          (!status.totalMarks || status.totalMarks === 0) &&
          (!status.attemptedQuestions || status.attemptedQuestions === 0) &&
          !status.haveStarted;

        if (dbStatus === 'Completed' && !dbResult && neverAttempted) {
          await ExamUserStatus.updateOne({ _id: status._id }, { $set: { result: 'Not Attempt' } });
          dbResult = 'Not Attempt';
        }

        if (status.result === 'failed') hasFailed = true;

        const examCompleted = await isExamFullyCompleted(exam._id);

        const obj = {
          examId: exam._id,
          statusManage: dbStatus,
          ScheduleTime: exam.ScheduleTime,
          ScheduleDate: exam.examDate,
          updatedScheduleTime: ongoingStart.format('HH:mm:ss'),
          bufferTime,
        };

        if (dbStatus === 'Completed') {
          obj.result = dbResult;
          if (examCompleted) {
            obj.rank = status.rank || null;
            if (!status.rank) {
              await calculateFinalRank(exam._id);
              const newS = await ExamUserStatus.findById(status._id).lean();
              obj.rank = newS?.rank || null;
            }
          } else obj.rank = null;
        }

        sendData.push(obj);
      }

      if (sendData.length) {
        socket.emit('examStatusUpdate', sendData);
      }
    }
  } catch (err) {
    console.error('OPTIMIZED CRON ERROR:', err);
  }
});

// --------------------------------------------------------------------
// START SERVER
// --------------------------------------------------------------------
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
