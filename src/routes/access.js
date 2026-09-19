const express = require('express');
const router = express.Router();
const authAdmin = require('../middleware/auth');
const { UserRepository } = require('../models/User');
const { AccessLogRepository } = require('../models/AccessLog');

// Helper function to calculate Euclidean Distance between two feature descriptor vectors
function euclideanDistance(arr1, arr2) {
  if (!arr1 || !arr2 || arr1.length !== arr2.length || arr1.length === 0) return Infinity;
  let sum = 0;
  for (let i = 0; i < arr1.length; i++) {
    const diff = arr1[i] - arr2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// 1. Verify Access via Face Recognition Descriptor
router.post('/verify-face', async (req, res) => {
  try {
    const { descriptor, threshold = 0.55 } = req.body;

    if (!descriptor || !Array.isArray(descriptor)) {
      return res.status(400).json({ success: false, message: 'Facial descriptor array required' });
    }

    const activeUsers = await UserRepository.find({ status: 'Active' });
    let bestMatch = null;
    let minDistance = Infinity;

    for (const user of activeUsers) {
      if (user.faceData && Array.isArray(user.faceData) && user.faceData.length > 0) {
        const dist = euclideanDistance(descriptor, user.faceData);
        if (dist < minDistance) {
          minDistance = dist;
          bestMatch = user;
        }
      }
    }

    if (bestMatch && minDistance <= threshold) {
      const matchScore = Math.max(0, Math.round((1 - minDistance) * 100));
      const log = await AccessLogRepository.create({
        userId: bestMatch._id || bestMatch.id,
        userName: bestMatch.name,
        role: bestMatch.role,
        nfcCardId: bestMatch.nfcCardId || '',
        matchScore,
        verificationMethod: 'FACE',
        accessStatus: 'GRANTED'
      });

      return res.json({
        success: true,
        accessGranted: true,
        matchScore,
        distance: minDistance.toFixed(4),
        user: {
          id: bestMatch._id || bestMatch.id,
          name: bestMatch.name,
          role: bestMatch.role,
          nfcCardId: bestMatch.nfcCardId,
          faceImagePath: bestMatch.faceImagePath
        },
        log
      });
    } else {
      const log = await AccessLogRepository.create({
        userName: 'Unknown Person',
        role: 'Unknown',
        matchScore: minDistance < Infinity ? Math.max(0, Math.round((1 - minDistance) * 100)) : 0,
        verificationMethod: 'FACE',
        accessStatus: 'DENIED',
        denialReason: 'No matching facial profile found within confidence threshold'
      });

      return res.json({
        success: false,
        accessGranted: false,
        matchScore: minDistance < Infinity ? Math.max(0, Math.round((1 - minDistance) * 100)) : 0,
        message: 'Access Denied: Unrecognized Face',
        log
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Verify Access via NFC ID Card
router.post('/verify-nfc', async (req, res) => {
  try {
    const { nfcCardId } = req.body;
    if (!nfcCardId || !nfcCardId.trim()) {
      return res.status(400).json({ success: false, message: 'NFC Card ID is required.' });
    }

    const cleanNfcId = nfcCardId.trim();
    const user = await UserRepository.findByNFC(cleanNfcId);

    if (user) {
      const log = await AccessLogRepository.create({
        userId: user._id || user.id,
        userName: user.name,
        role: user.role,
        nfcCardId: user.nfcCardId,
        matchScore: 100,
        verificationMethod: 'NFC',
        accessStatus: 'GRANTED'
      });

      return res.json({
        success: true,
        accessGranted: true,
        user: {
          id: user._id || user.id,
          name: user.name,
          role: user.role,
          nfcCardId: user.nfcCardId,
          faceImagePath: user.faceImagePath
        },
        log
      });
    } else {
      const log = await AccessLogRepository.create({
        userName: 'Unregistered NFC Holder',
        role: 'Unknown',
        nfcCardId: cleanNfcId,
        matchScore: 0,
        verificationMethod: 'NFC',
        accessStatus: 'DENIED',
        denialReason: 'NFC Card ID not registered or user suspended'
      });

      return res.json({
        success: false,
        accessGranted: false,
        message: 'Access Denied: Invalid or Unregistered NFC Card ID',
        log
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Hybrid Face + NFC Verification
router.post('/verify-hybrid', async (req, res) => {
  try {
    const { descriptor, nfcCardId, threshold = 0.55 } = req.body;

    if (!nfcCardId) {
      return res.status(400).json({ success: false, message: 'NFC Card ID required for hybrid verification.' });
    }

    const user = await UserRepository.findByNFC(nfcCardId.trim());

    if (!user) {
      const log = await AccessLogRepository.create({
        userName: 'Unknown User',
        role: 'Unknown',
        nfcCardId: nfcCardId.trim(),
        matchScore: 0,
        verificationMethod: 'HYBRID_FACE_NFC',
        accessStatus: 'DENIED',
        denialReason: 'NFC Card ID not found in system'
      });

      return res.json({
        success: false,
        accessGranted: false,
        message: 'Access Denied: Invalid NFC Card ID',
        log
      });
    }

    if (!descriptor || !Array.isArray(descriptor) || !user.faceData || user.faceData.length === 0) {
      const log = await AccessLogRepository.create({
        userId: user._id || user.id,
        userName: user.name,
        role: user.role,
        nfcCardId: user.nfcCardId,
        matchScore: 0,
        verificationMethod: 'HYBRID_FACE_NFC',
        accessStatus: 'DENIED',
        denialReason: 'Missing facial embedding for user verification'
      });

      return res.json({
        success: false,
        accessGranted: false,
        message: 'Access Denied: Face data missing for NFC card holder',
        log
      });
    }

    const dist = euclideanDistance(descriptor, user.faceData);
    if (dist <= threshold) {
      const matchScore = Math.max(0, Math.round((1 - dist) * 100));
      const log = await AccessLogRepository.create({
        userId: user._id || user.id,
        userName: user.name,
        role: user.role,
        nfcCardId: user.nfcCardId,
        matchScore,
        verificationMethod: 'HYBRID_FACE_NFC',
        accessStatus: 'GRANTED'
      });

      return res.json({
        success: true,
        accessGranted: true,
        matchScore,
        distance: dist.toFixed(4),
        user: {
          id: user._id || user.id,
          name: user.name,
          role: user.role,
          nfcCardId: user.nfcCardId,
          faceImagePath: user.faceImagePath
        },
        log
      });
    } else {
      const log = await AccessLogRepository.create({
        userId: user._id || user.id,
        userName: user.name,
        role: user.role,
        nfcCardId: user.nfcCardId,
        matchScore: Math.max(0, Math.round((1 - dist) * 100)),
        verificationMethod: 'HYBRID_FACE_NFC',
        accessStatus: 'DENIED',
        denialReason: 'Facial recognition did not match NFC card owner'
      });

      return res.json({
        success: false,
        accessGranted: false,
        message: 'Access Denied: Face photo does not match NFC card holder',
        log
      });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get Access Logs
router.get('/logs', authAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const logs = await AccessLogRepository.find(limit);
    res.json({ success: true, count: logs.length, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get Access Control Stats
router.get('/stats', authAdmin, async (req, res) => {
  try {
    const stats = await AccessLogRepository.getStats();
    res.json({ success: true, stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Clear Access Logs
router.delete('/logs', authAdmin, async (req, res) => {
  try {
    await AccessLogRepository.clearAll();
    res.json({ success: true, message: 'Logs cleared successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
