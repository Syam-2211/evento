const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Fallback JSON File Database Engine for environments without a running MongoDB server
class LocalJSONDb {
  constructor(dbDir) {
    this.dbDir = dbDir;
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }

  _getFilePath(collectionName) {
    return path.join(this.dbDir, `${collectionName}.json`);
  }

  getCollection(collectionName) {
    const filePath = this._getFilePath(collectionName);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify([]));
    }
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data || '[]');
    } catch (err) {
      return [];
    }
  }

  saveCollection(collectionName, data) {
    const filePath = this._getFilePath(collectionName);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }
}

const localDb = new LocalJSONDb(path.join(__dirname, '../../storage/db'));
let isMongoConnected = false;

const connectDB = async () => {
  try {
    if (process.env.MONGODB_URI) {
      mongoose.set('strictQuery', false);
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 2000
      });
      isMongoConnected = true;
      console.log('MongoDB Connected successfully.');
      return;
    }
  } catch (err) {
    console.warn('MongoDB connection failed. Falling back to local file-system database store:', err.message);
    isMongoConnected = false;
  }
};

const getDbState = () => ({
  isMongoConnected,
  localDb
});

module.exports = { connectDB, getDbState, localDb };
