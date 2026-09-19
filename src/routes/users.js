const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const authAdmin = require('../middleware/auth');
const { UserRepository } = require('../models/User');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../storage/faces'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `face_${Date.now()}_${Math.round(Math.random()*1E9)}${ext}`);
  }
});
const upload = multer({ storage });

// Get all users (Optionally filter by role)
router.get('/', authAdmin, async (req, res) => {
  try {
    const { role, status } = req.query;
    const query = {};
    if (role) query.role = role;
    if (status) query.status = status;

    const users = await UserRepository.find(query);
    res.json({ success: true, count: users.length, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get single user by ID
router.get('/:id', authAdmin, async (req, res) => {
  try {
    const user = await UserRepository.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Create new user (Student or Special Guest)
router.post('/', authAdmin, upload.single('faceImage'), async (req, res) => {
  try {
    const { name, role, nfcCardId, email, phone, notes, faceData } = req.body;

    if (!name || !role) {
      return res.status(400).json({ success: false, message: 'Name and role (Student or Special Guest) are required.' });
    }

    if (!['Student', 'Special Guest'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be either "Student" or "Special Guest".' });
    }

    let parsedFaceData = [];
    if (faceData) {
      parsedFaceData = typeof faceData === 'string' ? JSON.parse(faceData) : faceData;
    }

    const faceImagePath = req.file ? `/storage/faces/${req.file.filename}` : '';

    const newUser = await UserRepository.create({
      name,
      role,
      nfcCardId: nfcCardId ? nfcCardId.trim() : '',
      email: email || '',
      phone: phone || '',
      notes: notes || '',
      faceData: parsedFaceData,
      faceImagePath,
      status: 'Active'
    });

    res.status(201).json({ success: true, message: `${role} registered successfully!`, user: newUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update user details
router.put('/:id', authAdmin, upload.single('faceImage'), async (req, res) => {
  try {
    const { name, role, nfcCardId, email, phone, notes, status, faceData } = req.body;
    const updateFields = {};

    if (name !== undefined) updateFields.name = name;
    if (role !== undefined) updateFields.role = role;
    if (nfcCardId !== undefined) updateFields.nfcCardId = nfcCardId.trim();
    if (email !== undefined) updateFields.email = email;
    if (phone !== undefined) updateFields.phone = phone;
    if (notes !== undefined) updateFields.notes = notes;
    if (status !== undefined) updateFields.status = status;

    if (faceData !== undefined) {
      updateFields.faceData = typeof faceData === 'string' ? JSON.parse(faceData) : faceData;
    }

    if (req.file) {
      updateFields.faceImagePath = `/storage/faces/${req.file.filename}`;
    }

    const updatedUser = await UserRepository.update(req.params.id, updateFields);
    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User updated successfully', user: updatedUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Save / Update user face embedding descriptor
router.post('/:id/face-descriptor', authAdmin, async (req, res) => {
  try {
    const { faceData, faceImagePath } = req.body;
    if (!faceData || !Array.isArray(faceData)) {
      return res.status(400).json({ success: false, message: 'Valid faceData array embedding is required.' });
    }

    const updatedUser = await UserRepository.update(req.params.id, {
      faceData,
      ...(faceImagePath && { faceImagePath })
    });

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'Face descriptor stored locally & database updated.', user: updatedUser });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete user
router.delete('/:id', authAdmin, async (req, res) => {
  try {
    const success = await UserRepository.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, message: 'User removed successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
