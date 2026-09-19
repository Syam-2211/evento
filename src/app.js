require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/db');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const accessRoutes = require('./routes/access');
const cameraRoutes = require('./routes/camera');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving
app.use(express.static(path.join(__dirname, '../public')));
app.use('/storage', express.static(path.join(__dirname, '../storage')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/access', accessRoutes);
app.use('/api/camera', cameraRoutes);

// Fallback to main SPA
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start Server
if (require.main === module) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`Facial Recognition & NFC Access Control Server Running`);
      console.log(`Port: ${PORT}`);
      console.log(`URL:  http://localhost:${PORT}`);
      console.log(`====================================================`);
    });
  });
}

module.exports = app;
