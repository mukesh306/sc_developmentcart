// server.js (complete, fixed)
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

// In-memory store for exam start timestamps (used by socket "getExamTime")
const examStartTimes = {};

// SOCKET EVENTS
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

      const examDuration = parseInt(exam.ExamTime || 0, 10);

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
//  CRON JOB (EVERY 10 SEC)
//  - Emits status for ALL published exams (Option A)
//  - Ensures results are not overwritten by CRON
// ------------------------------------------------------------------

/**
 * Helper: parse exam.ScheduleTime which is assumed HH:mm:ss (24h).
 * Returns a moment in Asia/Kolkata timezone for that exam's date+time.
 */
function getScheduleDateTime(exam) {
  // Normalize exam date: if exam.examDate stored as Date or as string use moment directly
  const examDate = moment(exam.examDate).tz("Asia/Kolkata").format("YYYY-MM-DD");
  // Ensure ScheduleTime exists and fallback to 00:00:00
  const scheduleTime = exam.ScheduleTime || "00:00:00";
  return moment.tz(`${examDate} ${scheduleTime}`, "YYYY-MM-DD HH:mm:ss", "Asia/Kolkata");
}

setInterval(async () => {
  try {
    // fetch published exams
    const exams = await Schoolerexam.find({ publish: true }).lean();
    if (!exams || exams.length === 0) return;

    const markingSetting = await MarkingSetting.findOne().lean();
    const bufferTime = markingSetting?.bufferTime ? parseInt(markingSetting.bufferTime, 10) : 0;

    const socketArray = [];

    // For each exam compute status and push a single object per exam
    for (const exam of exams) {
      // fetch all user statuses for this exam once
      const userStatuses = await ExamUserStatus.find({ examId: exam._id }).lean();

      // ---------------------------------------------------------
      // 1) If ANY previous exam (different examId) for this user is Failed
      //    -> set this exam statuses for that user to Not Eligible (result null)
      //    NOTE: We avoid overwriting real results that are already set in other exams.
      // ---------------------------------------------------------
      let shouldBlockExamForAtLeastOneUser = false;

      // We'll collect userIds that must be set Not Eligible (then update once)
      const usersToBlock = new Set();

      for (const u of userStatuses) {
        // If a previous exam for this user elsewhere has result: "Failed"
        const prevFailed = await ExamUserStatus.findOne({
          userId: u.userId,
          examId: { $ne: exam._id },
          result: "Failed"
        }).lean();

        if (prevFailed) {
          shouldBlockExamForAtLeastOneUser = true;
          usersToBlock.add(String(u.userId));
        }
      }

      // Apply Not Eligible for usersToBlock (updateMany)
      if (usersToBlock.size > 0) {
        await ExamUserStatus.updateMany(
          { examId: exam._id, userId: { $in: Array.from(usersToBlock) } },
          { $set: { statusManage: "Not Eligible", result: null } }
        );
      }

      // Re-fetch user statuses if we made changes to ensure consistency
      const updatedUserStatuses = usersToBlock.size > 0
        ? await ExamUserStatus.find({ examId: exam._id }).lean()
        : userStatuses;

      // ---------------------------------------------------------
      // 2) If any user has statusManage === "Completed" AND result !== null,
      //    treat exam as already completed (do not change results).
      // ---------------------------------------------------------
      const alreadyCompleted = updatedUserStatuses.some(
        u => u.statusManage === "Completed" && u.result !== null
      );

      if (alreadyCompleted) {
        // Preserve actual stored result(s). If multiple users, pick the first explicit non-null result
        const preservedResult = updatedUserStatuses.find(u => u.result !== null)?.result || null;

        // Push single object for this exam with preserved result
        socketArray.push({
          examId: exam._id,
          statusManage: "Completed",
          ScheduleTime: exam.ScheduleTime,
          ScheduleDate: exam.ScheduleDate,
          bufferTime,
          updatedScheduleTime: exam.ScheduleTime,
          result: preservedResult
        });

        // Move to next exam (do not recalc schedule/ongoing/completed)
        continue;
      }

      // ---------------------------------------------------------
      // 3) Otherwise compute schedule / ongoing / completed based on time + buffer + exam duration
      // ---------------------------------------------------------
      const scheduleDateTime = getScheduleDateTime(exam);

      const ongoingStart = scheduleDateTime.clone().add(bufferTime, "minutes");
      const ongoingEnd = ongoingStart.clone().add(parseInt(exam.ExamTime || 0, 10), "minutes");

      const now = moment().tz("Asia/Kolkata");

      let statusManage = "Schedule";
      if (now.isBefore(ongoingStart)) statusManage = "Schedule";
      else if (now.isSameOrAfter(ongoingStart) && now.isBefore(ongoingEnd)) statusManage = "Ongoing";
      else if (now.isSameOrAfter(ongoingEnd)) statusManage = "Completed";

      // Update all ExamUserStatus documents for this exam with computed statusManage
      // NOTE: This does NOT touch their result fields (we avoid touching 'result' unless explicitly needed)
      await ExamUserStatus.updateMany(
        { examId: exam._id },
        { $set: { statusManage } }
      );

      // After updating statusManage, determine exam-level result:
      // If Completed -> determine if any attempt (finalScore or result) exists
      const allUsers = await ExamUserStatus.find({ examId: exam._id }).lean();
      const anyAttempt = allUsers.some(u => u.finalScore !== null && u.finalScore !== undefined) ||
                         allUsers.some(u => u.result !== null && u.result !== undefined);

      let examResult = null;
      if (statusManage === "Completed") {
        examResult = anyAttempt ? "Completed" : "Not Attempt";
      }

      socketArray.push({
        examId: exam._id,
        statusManage,
        ScheduleTime: exam.ScheduleTime,
        ScheduleDate: exam.ScheduleDate,
        bufferTime,
        updatedScheduleTime: ongoingStart.format("HH:mm:ss"),
        result: examResult
      });
    } // end for exams

    // Remove duplicates just in case (keeping last entry) and emit
    if (socketArray.length > 0 && global.io) {
      // Ensure uniqueness by examId (keep the last occurrence)
      const uniqueMap = new Map();
      for (const obj of socketArray) {
        uniqueMap.set(String(obj.examId), obj);
      }
      const uniqueArray = Array.from(uniqueMap.values());

      global.io.emit("examStatusUpdate", uniqueArray);
      console.log("📡 CRON EMIT:", uniqueArray);
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
