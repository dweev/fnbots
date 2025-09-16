// ─── Info ────────────────────────────────
/*
  * Created with ❤️ and 💦 By FN
  * Follow https://github.com/Terror-Machine
  * Feel Free To Use
*/
// ─── Info Settings.js ────────────────────

import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  botName: {
    type: String,
    default: 'FNBOTS'
  },
  botNumber: {
    type: String,
    default: ''
  },
  rname: {
    type: String,
    default: '.'
  },
  sname: {
    type: String,
    default: '/'
  },
  packName: {
    type: String,
    default: 'FNBOTS'
  },
  packAuthor: {
    type: String,
    default: 'FNBOTS'
  },
  packID: {
    type: String,
    default: 'FNBOTS'
  },
  pinoLogger: {
    type: String,
    default: 'silent',
    enum: ['silent', 'trace', 'debug', 'info', 'warn', 'error', 'fatal']
  },
  maintenance: {
    type: Boolean,
    default: false
  },
  totalHitCount: {
    type: Number,
    default: 0
  },
  autocommand: {
    type: String,
    default: ''
  },
  autocorrect: {
    type: Number,
    default: 0,
    enum: [0, 1, 2]
  }
}, {
  timestamps: true
});

settingsSchema.index({}, { unique: true });
settingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne();
  if (!settings) {
    settings = new this();
    await settings.save();
  }
  return settings;
};
settingsSchema.statics.updateSettings = async function (updates) {
  const settings = await this.getSettings();
  Object.assign(settings, updates);
  return settings.save();
};
settingsSchema.statics.incrementTotalHitCount = async function (amount = 1) {
  const settings = await this.getSettings();
  settings.totalHitCount += amount;
  return settings.save();
};
settingsSchema.methods.toggleMaintenance = function () {
  this.maintenance = !this.maintenance;
  return this.save();
};
settingsSchema.methods.updatePrefix = function (newPrefix) {
  this.rname = newPrefix;
  this.sname = newPrefix === '.' ? '/' : newPrefix;
  return this.save();
};
settingsSchema.pre('save', function (next) {
  if (this.rname === this.sname) {
    this.sname = this.rname === '.' ? '/' : '.';
  }
  next();
});

export default mongoose.model('Settings', settingsSchema);