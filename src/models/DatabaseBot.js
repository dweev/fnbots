// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
*/
// ─── Info DatabaseBot.js ─────────────────

import mongoose from 'mongoose';
import log from '../utils/logger.js';

const databaseBotSchema = new mongoose.Schema({
  docId: {
    type: String,
    default: 'DATABASE_BOT_SINGLETON',
    unique: true,
    required: true,
    index: true,
  },
  audio: { type: Map, of: String, default: {} },
  chat: { type: Map, of: String, default: {} },
  contact: { type: Map, of: String, default: {} },
  bacot: { type: [String], default: [] },
  image: { type: Map, of: String, default: {} },
  sticker: { type: Map, of: String, default: {} },
}, {
  timestamps: true,
});

databaseBotSchema.methods.addChat = function (keyword, reply) {
  if (this.chat.has(keyword)) {
    throw new Error(`Keyword "${keyword}" sudah ada di database.`);
  }
  this.chat.set(keyword, reply);
  return this.save();
};
databaseBotSchema.methods.editChat = function (keyword, newReply) {
  if (!this.chat.has(keyword)) {
    throw new Error(`Keyword "${keyword}" tidak ditemukan.`);
  }
  this.chat.set(keyword, newReply);
  return this.save();
};
databaseBotSchema.methods.deleteChat = function (keyword) {
  if (!this.chat.has(keyword)) {
    throw new Error(`Keyword "${keyword}" tidak ditemukan.`);
  }
  this.chat.delete(keyword);
  return this.save();
};
databaseBotSchema.methods.getChat = function (keyword) {
  return this.chat.get(keyword);
};
databaseBotSchema.methods.addBacot = function (text) {
  if (this.bacot.includes(text)) {
    throw new Error("Teks tersebut sudah ada.");
  }
  this.bacot.push(text);
  return this.save();
};
databaseBotSchema.methods.deleteBacot = function (text) {
  const initialLength = this.bacot.length;
  this.bacot = this.bacot.filter(b => b !== text);
  if (this.bacot.length === initialLength) {
    throw new Error("Teks tersebut tidak ditemukan.");
  }
  return this.save();
};
databaseBotSchema.methods.getRandomBacot = function () {
  if (this.bacot.length === 0) return null;
  const index = Math.floor(Math.random() * this.bacot.length);
  return this.bacot[index];
};

const types = ['audio', 'image', 'contact', 'sticker'];

types.forEach(type => {
  const capitalizedType = type.charAt(0).toUpperCase() + type.slice(1);
  databaseBotSchema.methods[`add${capitalizedType}`] = function (key, value) {
    if (this[type].has(key)) {
      throw new Error(`Kunci "${key}" untuk ${type} sudah ada.`);
    }
    this[type].set(key, value);
    return this.save();
  };
  databaseBotSchema.methods[`edit${capitalizedType}`] = function (key, newValue) {
    if (!this[type].has(key)) {
      throw new Error(`Kunci "${key}" untuk ${type} tidak ditemukan.`);
    }
    this[type].set(key, newValue);
    return this.save();
  };
  databaseBotSchema.methods[`delete${capitalizedType}`] = function (key) {
    if (!this[type].has(key)) {
      throw new Error(`Kunci "${key}" untuk ${type} tidak ditemukan.`);
    }
    this[type].delete(key);
    return this.save();
  };
  databaseBotSchema.methods[`get${capitalizedType}`] = function (key) {
    return this[type].get(key);
  };
});

databaseBotSchema.statics.getDatabase = async function () {
  try {
    const db = await this.findOne({ docId: 'DATABASE_BOT_SINGLETON' });
    if (!db) {
      log("Membuat dokumen DatabaseBot baru karena belum ada...");
      const newDb = new this();
      await newDb.save();
      return newDb;
    }
    return db;
  } catch (error) {
    log(`Error saat mengambil atau membuat DatabaseBot: ${error}`, true);
    throw error;
  }
};

export default mongoose.model('DatabaseBot', databaseBotSchema);