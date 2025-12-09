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

// MODELS (assumed existing)
const User = require('./models/User');
const Schoolerexam = require('./models/Schoolerexam');
const MarkingSetting = require('./models/markingSetting');
const ExamUserStatus = require('./models/ExamUserStatus');


// ROUTES (keep same as before)
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

// In-memory store for exam start timestamps (used by getExamTime)
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
// HELPER: FINAL RANK CALCULATION (idempotent)
// -------------------------------------------
async function calculateFinalRank(examId) {
  // Sort by totalMarks desc; if tie-handling needed, extend logic
  const users = await ExamUserStatus.find({ examId }).sort({ totalMarks: -1 }).lean();
  let rank = 1;
  for (const u of users) {
    // update only if rank missing or different (optional)
    await ExamUserStatus.updateOne({ _id: u._id }, { $set: { rank } });
    rank++;
  }
}

// Utility: emit examStatus update for a specific socket (keeps previous behavior)
async function emitExamStatusForSocket(socket) {
  try {
    const filterQuery = { userId: socket.user._id };

    if (socket.selectedCategory) {
      try {
        filterQuery['category._id'] = new mongoose.Types.ObjectId(socket.selectedCategory);
      } catch (e) {
        // ignore invalid category
      }
    }

    const userExamStatuses = await ExamUserStatus.find(filterQuery)
      .populate('examId', 'ScheduleTime ScheduleDate ExamTime publish examDate')
      .sort({ 'examId.examDate': 1, 'examId.ScheduleTime': 1 })
      .lean();

    const markingSetting = await MarkingSetting.findOne().lean();
    const bufferTime = markingSetting?.bufferTime ? parseInt(markingSetting.bufferTime) : 0;

    const userExams = [];

    for (const status of userExamStatuses) {
      const exam = status.examId;
      if (!exam || !exam.publish) continue;

      let statusManage = status.statusManage || 'Schedule';
      let result = status.result;

      const examDateTime = moment.tz(
        `${moment(exam.examDate).format('YYYY-MM-DD')} ${exam.ScheduleTime}`,
        'YYYY-MM-DD HH:mm:ss',
        'Asia/Kolkata'
      );

      const ongoingStart = examDateTime.clone().add(bufferTime, 'minutes');
      const ongoingEnd = ongoingStart.clone().add(exam.ExamTime || 0, 'minutes');
      const now = moment().tz('Asia/Kolkata');

      let computedStatus = statusManage;
      if (now.isBefore(ongoingStart)) computedStatus = 'Schedule';
      else if (now.isSameOrAfter(ongoingStart) && now.isBefore(ongoingEnd)) computedStatus = 'Ongoing';
      else if (now.isSameOrAfter(ongoingEnd)) computedStatus = 'Completed';

      // Update DB safely if status changed (keeps original intent)
      if (statusManage !== computedStatus) {
        statusManage = computedStatus;
        await ExamUserStatus.updateOne({ _id: status._id }, { $set: { statusManage } });
      }

      // determine Not Attempt (same conservative checks as before)
      const userNeverAttempted =
        (status.totalMarks === null || status.totalMarks === undefined || status.totalMarks === 0) &&
        (!status.attemptedQuestions || status.attemptedQuestions === 0) &&
        (status.haveStarted === false || status.haveStarted === undefined);

      if (statusManage === 'Completed' && (result === null || result === undefined) && userNeverAttempted) {
        result = 'Not Attempt';
        await ExamUserStatus.updateOne({ _id: status._id }, { $set: { result } });
      }

      const examFullyCompleted = await isExamFullyCompleted(exam._id);

      let examObj = {
        examId: exam._id,
        statusManage,
        ScheduleTime: exam.ScheduleTime,
        ScheduleDate: exam.ScheduleDate,
        bufferTime,
        updatedScheduleTime: ongoingStart.format('HH:mm:ss'),
      };

      if (statusManage === 'Schedule' || statusManage === 'Ongoing') {
        examObj.result = null;
        examObj.rank = null;
      } else if (statusManage === 'Completed') {
        examObj.result = status.result != null ? status.result : result || null;

        if (examFullyCompleted) {
          examObj.rank = status.rank || null;

          if (!status.rank) {
            // calculate ranks once and refresh
            await calculateFinalRank(exam._id);
            const updatedStatus = await ExamUserStatus.findById(status._id).lean();
            examObj.rank = updatedStatus?.rank || null;
          }
        } else {
          examObj.rank = null;
        }
      } else if (statusManage === 'Not Eligible') {
        examObj.result = null;
        examObj.rank = null;
      }

      userExams.push(examObj);
    } // end for statuses

    if (userExams.length) {
      socket.emit('examStatusUpdate', userExams);
    }
  } catch (err) {
    console.error('emitExamStatusForSocket error:', err);
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

  // Keep per-socket getExamTime behaviour (countdown)
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

  // --- When user requests their exams (emit current statuses)
  socket.on('getMyExams', async () => {
    await emitExamStatusForSocket(socket);
  });

  // ===================================================================
  // ========== MAIN EVENT: USER SUBMITS EXAM (EVENT-DRIVEN RANK) =======
  // ===================================================================
  // Assumed event name: "examSubmitted" with payload { examId }
  socket.on('examSubmitted', async ({ examId, marks, attemptedQuestions, haveStarted }) => {
    try {
      const userId = socket.user._id;

      // Optionally record marks/attempts if provided
      const updateFields = { statusManage: 'Completed' };
      if (typeof marks !== 'undefined') updateFields.totalMarks = marks;
      if (typeof attemptedQuestions !== 'undefined') updateFields.attemptedQuestions = attemptedQuestions;
      if (typeof haveStarted !== 'undefined') updateFields.haveStarted = haveStarted;

      await ExamUserStatus.updateOne(
        { examId, userId },
        { $set: updateFields }
      );

      // After updating this user's status, emit updated status back to them
      await emitExamStatusForSocket(socket);

      // Now check if everyone finished — if yes, calculate ranks ONCE and notify
      const allDone = await isExamFullyCompleted(examId);
      if (allDone) {
        // calculateFinalRank is idempotent enough here (overwrites ranks deterministically)
        await calculateFinalRank(examId);
        // notify participants that rank is ready (can be handled on client)
        io.emit('rankReady', { examId });
      }
    } catch (err) {
      console.error('examSubmitted handler error:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: (${socket.id})`);
  });
});

// --------------------------------------------------------------------
// LIGHTWEIGHT CRON — Health check (runs at second 0 of every minute)
// --------------------------------------------------------------------
// This cron is intentionally lightweight: it does not loop through sockets or recalc ranks.
// It's only for server health logging / optional cleanup tasks.
// If you want no cron at all, remove this block.
cron.schedule('0 * * * * *', async () => {
  try {
    console.log(`[${new Date().toISOString()}] Server health check - sockets:`, io.sockets.sockets.size);
    // OPTIONAL: add lightweight cleanup tasks here (e.g., clear stale examStartTimes older than X hours)
    // Example cleanup (non-blocking):
    const cutoff = Date.now() - 1000 * 60 * 60 * 6; // 6 hours
    for (const examId of Object.keys(examStartTimes)) {
      if (examStartTimes[examId] < cutoff) delete examStartTimes[examId];
    }
  } catch (err) {
    console.error('Health-check cron error:', err);
  }
});

// --------------------------------------------------------------------
// START SERVER
// --------------------------------------------------------------------
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
