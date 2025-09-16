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
  mutedUsers: [{
    userId: {
      type: String,
      required: true
    },
    mutedAt: {
      type: Date,
      default: Date.now
    },
    mutedBy: {
      type: String,
      default: 'system'
    },
    reason: {
      type: String,
      default: ''
    },
    _id: false
  }],
  blockedUsers: [{
    userId: {
      type: String,
      required: true
    },
    blockedAt: {
      type: Date,
      default: Date.now
    },
    blockedBy: {
      type: String,
      default: 'system'
    },
    reason: {
      type: String,
      default: ''
    },
    _id: false
  }],
  maxFileSize: {
    type: Number,
    default: 100
  },
  allowedMediaTypes: {
    type: [String],
    default: ['image', 'video', 'audio', 'document']
  },
  autoBackup: {
    type: Boolean,
    default: false
  },
  backupInterval: {
    type: Number,
    default: 24
  },
  language: {
    type: String,
    default: 'id',
    enum: ['id', 'en', 'es', 'pt', 'ar']
  },
  timezone: {
    type: String,
    default: 'Asia/Jakarta'
  }
}, {
  timestamps: true
});

settingsSchema.index({}, { unique: true });
settingsSchema.index({ 'mutedUsers.userId': 1 });
settingsSchema.index({ 'blockedUsers.userId': 1 });
settingsSchema.index({ 'sAdmin': 1 });

settingsSchema.virtual('mutedUsersCount').get(function () {
  return this.mutedUsers.length;
});
settingsSchema.virtual('blockedUsersCount').get(function () {
  return this.blockedUsers.length;
});
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
settingsSchema.statics.isUserMuted = async function (userId) {
  const settings = await this.getSettings();
  return settings.mutedUsers.some(user => user.userId === userId);
};
settingsSchema.statics.isUserBlocked = async function (userId) {
  const settings = await this.getSettings();
  return settings.blockedUsers.some(user => user.userId === userId);
};
settingsSchema.statics.getMutedUsers = async function () {
  const settings = await this.getSettings();
  return settings.mutedUsers;
};
settingsSchema.statics.getBlockedUsers = async function () {
  const settings = await this.getSettings();
  return settings.blockedUsers;
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
settingsSchema.methods.muteUser = function (userId, mutedBy = 'system', reason = '') {
  this.mutedUsers = this.mutedUsers.filter(user => user.userId !== userId);
  this.mutedUsers.push({
    userId: userId,
    mutedAt: new Date(),
    mutedBy: mutedBy,
    reason: reason
  });
  return this.save();
};
settingsSchema.methods.unmuteUser = function (userId) {
  const initialLength = this.mutedUsers.length;
  this.mutedUsers = this.mutedUsers.filter(user => user.userId !== userId);
  if (this.mutedUsers.length !== initialLength) {
    return this.save();
  }
  return this;
};
settingsSchema.methods.isUserMuted = function (userId) {
  return this.mutedUsers.some(user => user.userId === userId);
};
settingsSchema.methods.getMuteReason = function (userId) {
  const mutedUser = this.mutedUsers.find(user => user.userId === userId);
  return mutedUser ? mutedUser.reason : null;
};
settingsSchema.methods.blockUser = function (userId, blockedBy = 'system', reason = '') {
  this.blockedUsers = this.blockedUsers.filter(user => user.userId !== userId);
  this.blockedUsers.push({
    userId: userId,
    blockedAt: new Date(),
    blockedBy: blockedBy,
    reason: reason
  });
  return this.save();
};
settingsSchema.methods.unblockUser = function (userId) {
  const initialLength = this.blockedUsers.length;
  this.blockedUsers = this.blockedUsers.filter(user => user.userId !== userId);
  if (this.blockedUsers.length !== initialLength) {
    return this.save();
  }
  return this;
};
settingsSchema.methods.isUserBlocked = function (userId) {
  return this.blockedUsers.some(user => user.userId === userId);
};
settingsSchema.methods.getBlockReason = function (userId) {
  const blockedUser = this.blockedUsers.find(user => user.userId === userId);
  return blockedUser ? blockedUser.reason : null;
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
settingsSchema.methods.clearAllMutedUsers = function () {
  if (this.mutedUsers.length > 0) {
    this.mutedUsers = [];
    return this.save();
  }
  return this;
};
settingsSchema.methods.clearAllBlockedUsers = function () {
  if (this.blockedUsers.length > 0) {
    this.blockedUsers = [];
    return this.save();
  }
  return this;
};
settingsSchema.methods.updateMediaSettings = function (maxSize, allowedTypes) {
  if (maxSize !== undefined) this.maxFileSize = maxSize;
  if (allowedTypes !== undefined) this.allowedMediaTypes = allowedTypes;
  return this.save();
};
settingsSchema.methods.setBackupSettings = function (autoBackup, intervalHours) {
  if (autoBackup !== undefined) this.autoBackup = autoBackup;
  if (intervalHours !== undefined) this.backupInterval = intervalHours;
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