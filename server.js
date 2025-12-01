
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const connectDB = require('./config/db');

// 🔥 New imports for socket.io
const http = require("http");
const { Server } = require("socket.io");

const app = express();

const PORT = process.env.PORT || 5000;

const schoolRoutes = require('./routes/schoolRoutes');
const quoteRoutes = require('./routes/quoteRoutes');
const learningRoutes = require('./routes/learningRoutes');
const userRoutes = require('./routes/userRoutes');
const assignedRoutes = require('./routes/assignRoutes');
const topic = require('./routes/topicRoutes');
const experiencePoint = require('./routes/experiencePointRoutes');
const MarkingSetting = require('./routes/markingSettingRoutes');
const PracticesTest = require('./routes/practicesRoutes');
const SchoolerCategory = require('./routes/SchoolercategoryRoutes');
const SchoolerExam = require('./routes/SchoolerexamRoutes');
const UserExamGroup = require('./routes/userexamGroupRoutes');

const Organization = require('./routes/organizationSignRoutes');
const ClassSeat = require('./routes/classSeatRoutes');

connectDB();

app.use(cors());
app.use(express.json());


app.use('/chat', express.static(path.join(__dirname, 'chat')));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/v1', require('./routes/locationRoutes'));
app.use('/api/v1', require('./routes/learningRoutes'));
app.use('/api/v1', require('./routes/assignRoutes'));
app.use('/api/v1', require('./routes/topicRoutes'));
app.use('/api/v1', require('./routes/experiencePointRoutes'));
app.use('/api/v1', require('./routes/markingSettingRoutes'));
app.use('/api/v1', require('./routes/practicesRoutes'));

app.use('/api/v1', schoolRoutes);
app.use('/api/v1', quoteRoutes);
app.use('/api/v1', learningRoutes);
app.use('/api/v1', assignedRoutes);
app.use('/api/v1', userRoutes);
app.use('/api/v1', topic);
app.use('/api/v1', experiencePoint);
app.use('/api/v1', MarkingSetting);
app.use('/api/v1', PracticesTest);
app.use('/api/v1', SchoolerCategory);
app.use('/api/v1', SchoolerExam);
app.use('/api/v1', UserExamGroup);

app.use('/api/v1', Organization);
app.use('/api/v1', ClassSeat);

// ------------------------------------------------------------------
// 🔥 Socket.io Setup (Added)
// ------------------------------------------------------------------
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
// 🚀 Start server (Important: app.listen replaced with server.listen)
// ------------------------------------------------------------------
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
