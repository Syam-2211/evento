const mongoose = require('mongoose');
const { localDb, getDbState } = require('../config/db');
const crypto = require('crypto');

const AccessLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName: { type: String, required: true },
  role: { type: String, required: true },
  nfcCardId: { type: String, default: '' },
  matchScore: { type: Number, default: 0 },
  verificationMethod: { type: String, enum: ['FACE', 'NFC', 'HYBRID_FACE_NFC'], required: true },
  accessStatus: { type: String, enum: ['GRANTED', 'DENIED'], required: true },
  denialReason: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
});

const MongooseAccessLog = mongoose.model('AccessLog', AccessLogSchema);

class AccessLogRepository {
  static async create(logData) {
    if (getDbState().isMongoConnected) {
      const log = new MongooseAccessLog(logData);
      return await log.save();
    } else {
      const logs = localDb.getCollection('access_logs');
      const newLog = {
        _id: crypto.randomUUID(),
        ...logData,
        timestamp: new Date().toISOString()
      };
      logs.push(newLog);
      localDb.saveCollection('access_logs', logs);
      return newLog;
    }
  }

  static async find(limit = 100) {
    if (getDbState().isMongoConnected) {
      return await MongooseAccessLog.find().sort({ timestamp: -1 }).limit(limit);
    } else {
      const logs = localDb.getCollection('access_logs');
      return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);
    }
  }

  static async getStats() {
    let logs = [];
    let users = [];
    if (getDbState().isMongoConnected) {
      logs = await MongooseAccessLog.find();
      const UserRepository = require('./User').UserRepository;
      users = await UserRepository.find();
    } else {
      logs = localDb.getCollection('access_logs');
      users = localDb.getCollection('users');
    }

    const totalStudents = users.filter(u => u.role === 'Student').length;
    const totalGuests = users.filter(u => u.role === 'Special Guest').length;
    const totalGranted = logs.filter(l => l.accessStatus === 'GRANTED').length;
    const totalDenied = logs.filter(l => l.accessStatus === 'DENIED').length;

    return {
      totalUsers: users.length,
      totalStudents,
      totalGuests,
      totalGranted,
      totalDenied,
      totalLogs: logs.length
    };
  }
  static async clearAll() {
    if (getDbState().isMongoConnected) {
      await MongooseAccessLog.deleteMany({});
    } else {
      localDb.saveCollection('access_logs', []);
    }
  }
}

module.exports = { AccessLogRepository, MongooseAccessLog };
