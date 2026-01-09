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

const User = require('./models/User');
const Schoolerexam = require('./models/Schoolerexam');
const Notification = require('./models/notification');

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
const classSeatRoutes = require("./routes/classSeatRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors());
app.use(express.json());
 app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

global.io = io;

const onlineUsers = new Map();

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Token required'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'testsecret');
    const user = await User.findById(decoded.id);
    if (!user) return next(new Error('User not found'));
    socket.user = user;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

const examStartTimes = {};

io.on('connection', (socket) => {
  const userId = socket.user?._id?.toString();

  if (userId) {
    onlineUsers.set(userId, socket.id);
    console.log(` User connected: ${userId}`);
  }

  (async () => {
    try {
      if (!userId) return;

      const notifications = await Notification.find({ userId })
        .sort({ createdAt: -1 });

      socket.emit("myNotifications", notifications);
    } catch (err) {
      console.error("Notification socket error:", err);
    }
  })();
console.log("Notification",Notification)
  socket.on('getExamTime', async (examId) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(examId)) return;

      const exam = await Schoolerexam.findById(examId).select('ExamTime');
      if (!exam) return;

      if (!examStartTimes[examId]) examStartTimes[examId] = Date.now();

      const totalSeconds = exam.ExamTime * 60;
      const elapsed = Math.floor((Date.now() - examStartTimes[examId]) / 1000);
      let remaining = totalSeconds - elapsed;
      if (remaining < 0) remaining = 0;

      socket.emit('examTimeResponse', { examId, remaining });

      const interval = setInterval(() => {
        if (remaining <= 0) {
          clearInterval(interval);
          return;
        }
        remaining--;
        socket.emit('examCountdown', { examId, remaining });
      }, 1000);

      socket.on('disconnect', () => clearInterval(interval));
    } catch (err) {}
  });

  socket.on('disconnect', () => {
    if (userId) onlineUsers.delete(userId);
    console.log(` User disconnected: ${socket.id}`);
  });
});

global.sendNotificationToUser = (userId, payload) => {
  const socketId = onlineUsers.get(userId.toString());
  if (socketId) {
    io.to(socketId).emit("newNotification", payload);
  }
};

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});











// const express = require('express');
// const cors = require('cors');
// const path = require('path');
// require('dotenv').config();
// const connectDB = require('./config/db');

// const http = require('http');
// const { Server } = require('socket.io');
// const moment = require('moment-timezone');
// const mongoose = require('mongoose');
// const jwt = require('jsonwebtoken');

// const User = require('./models/User');
// const Schoolerexam = require('./models/Schoolerexam');

// const authRoutes = require('./routes/authRoutes');
// const locationRoutes = require('./routes/locationRoutes');
// const learningRoutes = require('./routes/learningRoutes');
// const assignRoutes = require('./routes/assignRoutes');
// const topicRoutes = require('./routes/topicRoutes');
// const experiencePointRoutes = require('./routes/experiencePointRoutes');
// const markingSettingRoutes = require('./routes/markingSettingRoutes');
// const practicesRoutes = require('./routes/practicesRoutes');
// const schoolRoutes = require('./routes/schoolRoutes');
// const quoteRoutes = require('./routes/quoteRoutes');
// const userRoutes = require('./routes/userRoutes');
// const SchoolercategoryRoutes = require('./routes/SchoolercategoryRoutes');
// const SchoolerexamRoutes = require('./routes/SchoolerexamRoutes');
// const userexamGroupRoutes = require('./routes/userexamGroupRoutes');
// const organizationSignRoutes = require('./routes/organizationSignRoutes');
// const classSeatRoutes = require("./routes/classSeatRoutes");

// const app = express();
// const PORT = process.env.PORT || 5000;

// connectDB();

// app.use(cors());
// app.use(express.json());
// // app.use(express.static(path.join(__dirname, 'public')));
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// app.use('/api/auth', authRoutes);
// app.use('/api/v1', locationRoutes);
// app.use('/api/v1', learningRoutes);
// app.use('/api/v1', assignRoutes);
// app.use('/api/v1', topicRoutes);
// app.use('/api/v1', experiencePointRoutes);
// app.use('/api/v1', markingSettingRoutes);
// app.use('/api/v1', practicesRoutes);
// app.use('/api/v1', schoolRoutes);
// app.use('/api/v1', quoteRoutes);
// app.use('/api/v1', userRoutes);
// app.use('/api/v1', SchoolercategoryRoutes);
// app.use('/api/v1', SchoolerexamRoutes);
// app.use('/api/v1', userexamGroupRoutes);
// app.use('/api/v1', organizationSignRoutes);
// app.use('/api/v1', classSeatRoutes);

// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: { origin: '*', methods: ['GET', 'POST'] },
// });
// global.io = io;


// io.use(async (socket, next) => {
//   const token = socket.handshake.auth?.token;
//   if (!token) return next(new Error('Authentication error: Token required'));

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET || 'testsecret');
//     const user = await User.findById(decoded.id);
//     if (!user) return next(new Error('Authentication error: User not found'));
//     socket.user = user;
//     next();
//   } catch (err) {
//     next(new Error('Authentication error: Invalid token'));
//   }
// });


// const examStartTimes = {};


// io.on('connection', (socket) => {
//   console.log(`✅ User connected: ${socket.user?.firstName || 'Unknown'} (${socket.id})`);

//   socket.on('getExamTime', async (examId) => {
//     try {
//       if (!examId || !mongoose.Types.ObjectId.isValid(examId)) {
//         return socket.emit('examTimeResponse', { error: 'Invalid examId' });
//       }

//       const exam = await Schoolerexam.findById(examId).select('ExamTime').lean();
//       if (!exam) return socket.emit('examTimeResponse', { error: 'Exam not found' });

//       const examDuration = exam.ExamTime || 0;

//       if (!examStartTimes[examId]) examStartTimes[examId] = Date.now();

//       let elapsedSeconds = Math.floor((Date.now() - examStartTimes[examId]) / 1000);
//       let remainingSeconds = examDuration * 60 - elapsedSeconds;
//       if (remainingSeconds < 0) remainingSeconds = 0;

//       socket.emit('examTimeResponse', {
//         examId,
//         ExamTime: examDuration,
//         remainingSeconds,
//       });

//       const interval = setInterval(() => {
//         if (remainingSeconds <= 0) {
//           socket.emit('examCountdown', { examId, remainingSeconds: 0 });
//           clearInterval(interval);
//           return;
//         }
//         remainingSeconds--;
//         socket.emit('examCountdown', { examId, remainingSeconds });
//       }, 1000);

//       socket.on('disconnect', () => clearInterval(interval));
//     } catch (err) {
//       socket.emit('examTimeResponse', { error: 'Internal server error' });
//     }
//   });

//   socket.on('disconnect', () => {
//     console.log(` User disconnected: (${socket.id})`);
//   });
// });


// server.listen(PORT, () => console.log(`Server running on port ${PORT}`));




