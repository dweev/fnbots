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
    default: null
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
    default: 'FN'
  },
  packID: {
    type: String,
    default: 'FN-Bot-Sticker'
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
    default: null
  },
  autocorrect: {
    type: Number,
    default: 0,
    enum: [0, 1, 2]
  },
  sAdmin: {
    type: [String],
    default: []
  },
  groupIdentity: {
    type: String,
    default: null
  },
  linkIdentity: {
    type: String,
    default: null
  },
  restartId: {
    type: String,
    default: null
  },
  restartState: {
    type: Boolean,
    default: false
  },
  banChats: {
    type: Boolean,
    default: false
  },
  autojoin: {
    type: Boolean,
    default: false
  },
  changer: {
    type: Boolean,
    default: false
  },
  filter: {
    type: Boolean,
    default: false
  },
  chatbot: {
    type: Boolean,
    default: true
  },
  autosticker: {
    type: Boolean,
    default: false
  },
  debugs: {
    type: Boolean,
    default: false
  },
  antideleted: {
    type: Boolean,
    default: false
  },
  verify: {
    type: Boolean,
    default: false
  },
  autoreadsw: {
    type: Boolean,
    default: false
  },
  autolikestory: {
    type: Boolean,
    default: false
  },
  autoread: {
    type: Boolean,
    default: false
  },
  autodownload: {
    type: Boolean,
    default: false
  },
  anticall: {
    type: Boolean,
    default: false
  },
  limitCount: {
    type: Number,
    default: 100
  },
  limitGame: {
    type: Number,
    default: 100
  },
  limitCountPrem: {
    type: Number,
    default: 300
  },
  memberLimit: {
    type: Number,
    default: 50
  },
  dataM: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
}, {
  timestamps: true
});

settingsSchema.index({}, { unique: true });
settingsSchema.index({ 'sAdmin': 1 });


settingsSchema.virtual('prefix').get(function () {
  return this.rname;
});
settingsSchema.virtual('botname').get(function () {
  return this.botName;
}).set(function (value) {
  this.botName = value;
});
settingsSchema.virtual('totalhitcount').get(function () {
  return this.totalHitCount;
}).set(function (value) {
  this.totalHitCount = value;
});

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
settingsSchema.statics.isSAdmin = async function (userId) {
  const settings = await this.getSettings();
  return settings.sAdmin.includes(userId);
};
settingsSchema.statics.getSAdmins = async function () {
  const settings = await this.getSettings();
  return settings.sAdmin;
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
settingsSchema.methods.addSAdmin = function (userId) {
  if (!this.sAdmin.includes(userId)) {
    this.sAdmin.push(userId);
    return this.save();
  }
  return this;
};
settingsSchema.methods.removeSAdmin = function (userId) {
  const initialLength = this.sAdmin.length;
  this.sAdmin = this.sAdmin.filter(id => id !== userId);
  if (this.sAdmin.length !== initialLength) {
    return this.save();
  }
  return this;
};
settingsSchema.methods.isSAdmin = function (userId) {
  return this.sAdmin.includes(userId);
};
settingsSchema.methods.clearAllSAdmins = function () {
  if (this.sAdmin.length > 0) {
    this.sAdmin = [];
    return this.save();
  }
  return this;
};
settingsSchema.methods.toggleSetting = function (settingName) {
  if (typeof this[settingName] === 'boolean') {
    this[settingName] = !this[settingName];
    return this.save();
  }
  return this;
};
settingsSchema.methods.setDataM = function (key, value) {
  this.dataM.set(key, value);
  return this.save();
};
settingsSchema.methods.getDataM = function (key) {
  return this.dataM.get(key);
};
settingsSchema.methods.deleteDataM = function (key) {
  this.dataM.delete(key);
  return this.save();
};
settingsSchema.methods.clearDataM = function () {
  this.dataM.clear();
  return this.save();
};
settingsSchema.methods.updateLimitSettings = function (limitCount, limitGame, limitCountPrem, memberLimit) {
  if (limitCount !== undefined) this.limitCount = limitCount;
  if (limitGame !== undefined) this.limitGame = limitGame;
  if (limitCountPrem !== undefined) this.limitCountPrem = limitCountPrem;
  if (memberLimit !== undefined) this.memberLimit = memberLimit;
  return this.save();
};

settingsSchema.pre('save', function (next) {
  if (this.rname === this.sname) {
    this.sname = this.rname === '.' ? '/' : '.';
  }
  next();
});

settingsSchema.set('toJSON', { virtuals: true });
settingsSchema.set('toObject', { virtuals: true });

export default mongoose.model('Settings', settingsSchema);