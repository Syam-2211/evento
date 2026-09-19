const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const authAdmin = require('../middleware/auth');

// Save a base64-encoded webcam face snapshot to disk
router.post('/save-snapshot', authAdmin, async (req, res) => {
  try {
    const { imageData, userId } = req.body;

    if (!imageData) {
      return res.status(400).json({ success: false, message: 'No image data provided.' });
    }

    // Strip the data URL prefix (e.g. "data:image/jpeg;base64,")
    const matches = imageData.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
    if (!matches) {
      return res.status(400).json({ success: false, message: 'Invalid base64 image data format.' });
    }

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');

    const fileName = `face_${userId || 'unknown'}_${Date.now()}.${ext}`;
    const facesDir = path.join(__dirname, '../../storage/faces');

    // Ensure directory exists
    if (!fs.existsSync(facesDir)) {
      fs.mkdirSync(facesDir, { recursive: true });
    }

    const filePath = path.join(facesDir, fileName);
    fs.writeFileSync(filePath, buffer);

    const publicPath = `/storage/faces/${fileName}`;
    res.json({
      success: true,
      message: 'Face snapshot saved successfully.',
      filePath: publicPath,
      fileName
    });
  } catch (err) {
    console.error('Snapshot save error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
