// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info Group.js ───────────────────────

import mongoose from 'mongoose';
import MutedMember from './MutedMember.js';

const groupSchema = new mongoose.Schema({
  groupId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    validate: {
      validator: function (v) {
        return v.endsWith('@g.us');
      },
      message: 'Group ID must end with @g.us'
    }
  },
  groupName: {
    type: String,
    default: ''
  },
  groupDescription: {
    type: String,
    default: ''
  },
  groupCreated: {
    type: Date,
    default: Date.now
  },
  welcomeMessage: {
    type: String,
    default: ''
  },
  leaveMessage: {
    type: String,
    default: ''
  },
  promoteMessage: {
    type: String,
    default: ''
  },
  demoteMessage: {
    type: String,
    default: ''
  },
  antiTagStory: {
    type: Boolean,
    default: false,
    index: true
  },
  antiHidetag: {
    type: Boolean,
    default: false,
    index: true
  },
  antilink: {
    type: Boolean,
    default: false,
    index: true
  },
  antiVirtex: {
    type: Boolean,
    default: false,
    index: true
  },
  antiBadword: {
    type: Boolean,
    default: false,
    index: true
  },
  verifyMember: {
    type: Boolean,
    default: false
  },
  memberCount: {
    type: Number,
    default: 0
  },
  adminCount: {
    type: Number,
    default: 0
  },
  warnings: {
    type: Map,
    of: Number,
    default: {}
  },
  muteDuration: {
    type: Number,
    default: 3600
  },
  bannedMembers: {
    type: [String],
    default: []
  },
  afkUsers: [{
    userId: {
      type: String,
      required: true
    },
    time: {
      type: Date,
      default: Date.now
    },
    reason: {
      type: String,
      default: ''
    },
    _id: false
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  messageCount: {
    type: Number,
    default: 0
  },
  commandCount: {
    type: Number,
    default: 0
  },
  dailyStats: {
    type: Map,
    of: Number,
    default: {}
  },
  isMuted: {
    type: Boolean,
    default: false,
    index: true
  },
  mutedAt: {
    type: Date,
    default: null
  },
  mutedBy: {
    type: String,
    default: null
  },
  filter: {
    type: Boolean,
    default: false
  },
  filterWords: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

groupSchema.virtual('warningCount').get(function () {
  return Array.from(this.warnings.values()).reduce((sum, count) => sum + count, 0);
});
groupSchema.virtual('activeMemberCount').get(function () {
  return this.memberCount - this.bannedMembers.length;
});
groupSchema.virtual('afkCount').get(function () {
  return this.afkUsers.length;
});
groupSchema.virtual('mutechatDuration').get(function () {
  if (!this.isMuted || !this.mutedAt) return null;
  return Date.now() - this.mutedAt.getTime();
});

groupSchema.methods.addWarning = function (userId) {
  const currentWarnings = this.warnings.get(userId) || 0;
  this.warnings.set(userId, currentWarnings + 1);
  return this.save();
};
groupSchema.methods.resetWarnings = function (userId) {
  this.warnings.delete(userId);
  return this.save();
};
groupSchema.methods.getWarnings = function (userId) {
  return this.warnings.get(userId) || 0;
};
groupSchema.methods.clearAllWarnings = function () {
  this.warnings.clear();
  return this.save();
};
groupSchema.methods.muteMember = async function (userId, durationMs = this.muteDuration * 1000) {
  const expiryDate = new Date(Date.now() + durationMs);
  await MutedMember.findOneAndUpdate(
    { groupId: this.groupId, userId: userId },
    { $set: { expireAt: expiryDate } },
    { upsert: true, new: true }
  );
  return this.save();
};
groupSchema.methods.unmuteMember = async function (userId) {
  await MutedMember.deleteOne({ groupId: this.groupId, userId: userId });
  return this.save();
};
groupSchema.methods.isMemberMuted = async function (userId) {
  const isMuted = await MutedMember.exists({ groupId: this.groupId, userId: userId });
  return !!isMuted;
};
groupSchema.methods.banMember = function (userId) {
  if (!this.bannedMembers.includes(userId)) {
    this.bannedMembers.push(userId);
    return this.save();
  }
  return Promise.resolve(this);
};
groupSchema.methods.unbanMember = function (userId) {
  this.bannedMembers = this.bannedMembers.filter(id => id !== userId);
  return this.save();
};
groupSchema.methods.isMemberBanned = function (userId) {
  return this.bannedMembers.includes(userId);
};
groupSchema.methods.addAfkUser = function (userId, reason = '') {
  this.afkUsers = this.afkUsers.filter(afk => afk.userId !== userId);
  this.afkUsers.push({
    userId: userId,
    time: new Date(),
    reason: reason
  });
  return this.save();
};
groupSchema.methods.checkAfkUser = function (userId) {
  return this.afkUsers.some(afk => afk.userId === userId);
};
groupSchema.methods.getAfkReason = function (userId) {
  const afkUser = this.afkUsers.find(afk => afk.userId === userId);
  return afkUser ? afkUser.reason : null;
};
groupSchema.methods.getAfkTime = function (userId) {
  const afkUser = this.afkUsers.find(afk => afk.userId === userId);
  return afkUser ? afkUser.time : null;
};
groupSchema.methods.getAfkData = function (userId) {
  return this.afkUsers.find(afk => afk.userId === userId) || null;
};
groupSchema.methods.getAfkPosition = function (userId) {
  return this.afkUsers.findIndex(afk => afk.userId === userId);
};
groupSchema.methods.removeAfkUser = function (userId) {
  const position = this.getAfkPosition(userId);
  if (position !== -1) {
    const removedUser = this.afkUsers[position];
    this.afkUsers.splice(position, 1);
    return this.save().then(() => removedUser);
  }
  return Promise.resolve(null);
};
groupSchema.methods.handleUserReturn = async function (userId, currentTime) {
  if (this.checkAfkUser(userId)) {
    const position = this.getAfkPosition(userId);
    const afkData = this.afkUsers[position];
    let duration = null;
    if (afkData && afkData.time) {
      duration = currentTime - afkData.time;
    }
    this.afkUsers.splice(position, 1);
    await this.save();
    return {
      success: true,
      afkData: afkData,
      duration: duration
    };
  }
  return { success: false };
};
groupSchema.methods.clearAllAfk = function () {
  if (this.afkUsers.length > 0) {
    this.afkUsers = [];
    return this.save();
  }
  return this;
};
groupSchema.methods.incrementMessageCount = function () {
  this.messageCount += 1;
  const today = new Date().toISOString().split('T')[0];
  const dailyCount = this.dailyStats.get(today) || 0;
  this.dailyStats.set(today, dailyCount + 1);
  return this.save();
};
groupSchema.methods.incrementCommandCount = function () {
  this.commandCount += 1;
  return this.save();
};
groupSchema.methods.toggleSetting = function (settingName) {
  if (this[settingName] !== undefined) {
    this[settingName] = !this[settingName];
  }
  return this.save();
};
groupSchema.methods.updateMessages = function (welcomeMsg = null, leaveMsg = null, promoteMsg = null, demoteMsg = null) {
  if (welcomeMsg !== null) this.welcomeMessage = welcomeMsg;
  if (leaveMsg !== null) this.leaveMessage = leaveMsg;
  if (promoteMsg !== null) this.promoteMessage = promoteMsg;
  if (demoteMsg !== null) this.demoteMessage = demoteMsg;
  return this.save();
};
groupSchema.methods.muteChat = function (mutedBy = 'system') {
  this.isMuted = true;
  this.mutedAt = new Date();
  this.mutedBy = mutedBy;
  return this.save();
};
groupSchema.methods.unmuteChat = function () {
  this.isMuted = false;
  this.mutedAt = null;
  this.mutedBy = null;
  return this.save();
};
groupSchema.methods.toggleMuteChat = function (mutedBy = 'system') {
  this.isMuted = !this.isMuted;
  if (this.isMuted) {
    this.mutedAt = new Date();
    this.mutedBy = mutedBy;
  } else {
    this.mutedAt = null;
    this.mutedBy = null;
  }
  return this.save();
};
groupSchema.methods.toggleFilter = function () {
  this.filter = !this.filter;
  return this.save();
};
groupSchema.methods.addFilterWord = function (word) {
  if (!this.filterWords.includes(word)) {
    this.filterWords.push(word);
    return this.save();
  }
  return this;
};
groupSchema.methods.removeFilterWord = function (word) {
  const initialLength = this.filterWords.length;
  this.filterWords = this.filterWords.filter(w => w !== word);
  if (this.filterWords.length !== initialLength) {
    return this.save();
  }
  return this;
};
groupSchema.methods.hasFilterWord = function (word) {
  return this.filterWords.includes(word);
};
groupSchema.methods.clearAllFilterWords = function () {
  if (this.filterWords.length > 0) {
    this.filterWords = [];
    return this.save();
  }
  return this;
};
groupSchema.methods.checkMessage = function (message) {
  if (!this.filter) return false;
  const lowerMessage = message.toLowerCase();
  return this.filterWords.some(word =>
    lowerMessage.includes(word.toLowerCase())
  );
};

groupSchema.statics.ensureGroup = async function (groupId) {
  return this.findOneAndUpdate(
    { groupId },
    { $setOnInsert: { groupId } },
    { upsert: true, new: true }
  );
};
groupSchema.statics.findBySetting = function (settingName, value = true) {
  return this.find({ [settingName]: value });
};
groupSchema.statics.findGroupsWithWarnings = function () {
  return this.find({
    $expr: { $gt: [{ $size: { $objectToArray: "$warnings" } }, 0] }
  });
};
groupSchema.statics.findGroupsWithAfkUsers = function () {
  return this.find({
    'afkUsers.0': { $exists: true }
  });
};
groupSchema.statics.findUserAfkStatus = function (userId) {
  return this.find({
    'afkUsers.userId': userId
  }).select('groupId groupName afkUsers.$');
};
groupSchema.statics.findActiveGroups = function (minActivityDays = 7) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - minActivityDays);
  return this.find({
    isActive: true,
    lastActivity: { $gte: cutoffDate }
  });
};
groupSchema.statics.findInactiveGroups = function (inactiveDays = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);
  return this.find({
    $or: [
      { isActive: false },
      { lastActivity: { $lte: cutoffDate } }
    ]
  });
};
groupSchema.statics.getGroupStats = function () {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalGroups: { $sum: 1 },
        activeGroups: { $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] } },
        totalMembers: { $sum: "$memberCount" },
        totalMessages: { $sum: "$messageCount" },
        totalCommands: { $sum: "$commandCount" },
        totalAfkUsers: { $sum: { $size: "$afkUsers" } },
        avgMembers: { $avg: "$memberCount" }
      }
    }
  ]);
};
groupSchema.statics.cleanupOldAfkUsers = function (maxAfkHours = 24) {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - maxAfkHours);
  return this.updateMany(
    {},
    {
      $pull: {
        afkUsers: {
          time: { $lt: cutoffDate }
        }
      }
    }
  );
};
groupSchema.statics.findMutedGroups = function () {
  return this.find({ isMuted: true });
};
groupSchema.statics.countMutedGroups = function () {
  return this.countDocuments({ isMuted: true });
};
groupSchema.statics.findGroupsWithFilter = function () {
  return this.find({ filter: true });
};
groupSchema.statics.findFilteredWords = function (groupId) {
  return this.findOne({ groupId })
    .select('filterWords')
    .then(group => group ? group.filterWords : []);
};

groupSchema.index({ lastActivity: -1 });
groupSchema.index({ memberCount: -1 });
groupSchema.index({ isActive: 1, lastActivity: -1 });
groupSchema.index({ isMuted: 1, mutedAt: -1 });
groupSchema.index({ filter: 1 });
groupSchema.index({ filterWords: 1 });
groupSchema.index({ 'afkUsers.userId': 1 });
groupSchema.index({ 'afkUsers.time': -1 });

groupSchema.pre('save', function (next) {
  if (this.isModified()) {
    this.lastActivity = new Date();
  }
  next();
});

groupSchema.set('toJSON', { virtuals: true });
groupSchema.set('toObject', { virtuals: true });

export default mongoose.model('Group', groupSchema);