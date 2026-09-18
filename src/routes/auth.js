const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Admin Auth Route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

    if (username !== adminUser || password !== adminPass) {
      return res.status(401).json({ success: false, message: 'Invalid admin username or password.' });
    }

    const token = jwt.sign(
      { username, role: 'Admin' },
      process.env.JWT_SECRET || 'supersecret_admin_jwt_key_2026',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Admin authentication successful',
      token,
      user: { username, role: 'Admin' }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, authenticated: false });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret_admin_jwt_key_2026');
    return res.json({ success: true, authenticated: true, user: decoded });
  } catch (e) {
    return res.status(401).json({ success: false, authenticated: false });
  }
});

module.exports = router;
