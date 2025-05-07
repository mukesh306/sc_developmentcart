const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const connectDB = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;
const schoolRoutes = require('./routes/schoolRoutes');
const collegeRoutes = require('./routes/collegeRoutes');
const userRoutes = require('./routes/userRoutes');
connectDB();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/v1', require('./routes/locationRoutes'));


app.use('/api/v1', schoolRoutes);
app.use('/api/v1', collegeRoutes);
app.use('/api/v1', userRoutes);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));