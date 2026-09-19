const mongoose = require('mongoose');
const { localDb, getDbState } = require('../config/db');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, enum: ['Student', 'Special Guest'], required: true },
  nfcCardId: { type: String, unique: true, sparse: true },
  faceData: { type: [Number], default: [] }, // 128-float embedding vector
  faceImagePath: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Suspended'], default: 'Active' },
  notes: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const MongooseUser = mongoose.model('User', UserSchema);

class UserRepository {
  static async find(query = {}) {
    if (getDbState().isMongoConnected) {
      return await MongooseUser.find(query).sort({ createdAt: -1 });
    } else {
      let items = localDb.getCollection('users');
      if (query.role) items = items.filter(i => i.role === query.role);
      if (query.nfcCardId) items = items.filter(i => i.nfcCardId === query.nfcCardId);
      if (query.status) items = items.filter(i => i.status === query.status);
      return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  }

  static async findById(id) {
    if (getDbState().isMongoConnected) {
      return await MongooseUser.findById(id);
    } else {
      const items = localDb.getCollection('users');
      return items.find(i => i._id === id || i.id === id) || null;
    }
  }

  static async findByNFC(nfcCardId) {
    if (getDbState().isMongoConnected) {
      return await MongooseUser.findOne({ nfcCardId, status: 'Active' });
    } else {
      const items = localDb.getCollection('users');
      return items.find(i => i.nfcCardId === nfcCardId && i.status === 'Active') || null;
    }
  }

  static async create(userData) {
    if (getDbState().isMongoConnected) {
      const user = new MongooseUser(userData);
      return await user.save();
    } else {
      const items = localDb.getCollection('users');
      const newUser = {
        _id: crypto.randomUUID(),
        ...userData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      items.push(newUser);
      localDb.saveCollection('users', items);
      return newUser;
    }
  }

  static async update(id, updateData) {
    if (getDbState().isMongoConnected) {
      return await MongooseUser.findByIdAndUpdate(id, { ...updateData, updatedAt: Date.now() }, { new: true });
    } else {
      const items = localDb.getCollection('users');
      const idx = items.findIndex(i => i._id === id || i.id === id);
      if (idx === -1) return null;
      items[idx] = {
        ...items[idx],
        ...updateData,
        updatedAt: new Date().toISOString()
      };
      localDb.saveCollection('users', items);
      return items[idx];
    }
  }

  static async delete(id) {
    if (getDbState().isMongoConnected) {
      return await MongooseUser.findByIdAndDelete(id);
    } else {
      let items = localDb.getCollection('users');
      const initialLen = items.length;
      items = items.filter(i => i._id !== id && i.id !== id);
      if (items.length < initialLen) {
        localDb.saveCollection('users', items);
        return true;
      }
      return false;
    }
  }
}

module.exports = { UserRepository, MongooseUser };
