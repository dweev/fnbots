// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info User.js ────────────────────────

import mongoose from 'mongoose';
import config from '../../config.js';

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  isMaster: {
    type: Boolean,
    default: false
  },
  isVIP: {
    type: Boolean,
    default: false
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  vipExpired: {
    type: Date,
    default: null
  },
  premiumExpired: {
    type: Date,
    default: null
  },
  commandStats: {
    type: Map,
    of: Number,
    default: {}
  },
  limit: {
    current: {
      type: Number,
      default: 100
    },
    warned: {
      type: Boolean,
      default: false
    },
    lastReset: {
      type: Date,
      default: Date.now
    }
  },
  limitgame: {
    current: {
      type: Number,
      default: 100
    },
    warned: {
      type: Boolean,
      default: false
    },
    lastReset: {
      type: Date,
      default: Date.now
    }
  },
  balance: {
    type: String,
    default: "0",
    get: v => BigInt(v),
    set: v => v.toString()
  },
  xp: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },
  gacha: {
    type: Boolean,
    default: false
  },
  inventory: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  userCount: {
    type: Number,
    default: 0
  },
  mutedUsers: [{
    userId: {
      type: String,
      required: true
    }
  }],
  blockedUsers: [{
    userId: {
      type: String,
      required: true
    }
  }],
}, {
  timestamps: true,
  toJSON: {
    virtuals: true,
    getters: true
  },
  toObject: {
    virtuals: true,
    getters: true
  }
});

userSchema.pre('save', function (next) {
  if (this.isNew) {
    this.limit.current = this.isPremium ? 300 : 100;
    this.limitgame.current = this.isPremium ? 300 : 100;
  } else if (this.isModified('isPremium')) {
    this.limit.current = this.isPremium ? 300 : 100;
    this.limitgame.current = this.isPremium ? 300 : 100;
  }
  next();
});

userSchema.virtual('mutedUsersCount').get(function () {
  return this.mutedUsers.length;
});
userSchema.virtual('blockedUsersCount').get(function () {
  return this.blockedUsers.length;
});
userSchema.virtual('isVIPActive').get(function () {
  return !!(this.isVIP && this.vipExpired && this.vipExpired > new Date());
});
userSchema.virtual('isPremiumActive').get(function () {
  return !!(this.isPremium && this.premiumExpired && this.premiumExpired > new Date());
});
userSchema.virtual('maxXp').get(function () {
  const xpThresholds = [0, 1250, 3800, 5400, 7600, 9300, 12000, 18000, 24000, 30000];
  return xpThresholds[this.level] || 50000;
});
userSchema.virtual('levelName').get(function () {
  const names = [null, 'Beginner', 'Intermediate', 'Public', 'Pro', 'Expert', 'Master', 'Grandmaster', 'Epic', 'Legend'];
  return names[this.level] || 'Mythic';
});

userSchema.methods.addCommandCount = function (commandName, count = 1) {
  const currentCount = this.commandStats.get(commandName) || 0;
  this.commandStats.set(commandName, currentCount + count);
  return this.save();
};
userSchema.methods.getCommandCount = function (commandName) {
  return this.commandStats.get(commandName) || 0;
};
userSchema.methods.addLimit = async function (count = 1) {
  const isSadmin = config.ownerNumber.includes(this.userId);
  if (isSadmin || this.isMaster || this.isVIPActive) return false;
  this.limit.current -= count;
  return this.save();
};
userSchema.methods.addGameLimit = async function (count = 1) {
  const isSadmin = config.ownerNumber.includes(this.userId);
  if (isSadmin || this.isMaster || this.isVIPActive) return false;
  this.limitgame.current -= count;
  return this.save();
};
userSchema.methods.isLimit = function () {
  const isSadmin = config.ownerNumber.includes(this.userId);
  if (isSadmin || this.isMaster || this.isVIPActive) return false;
  if (this.limit.current <= 0) {
    if (!this.limit.warned) {
      this.limit.warned = true;
      this.save();
    }
    return true;
  }
  if (this.limit.warned) {
    this.limit.warned = false;
    this.save();
  }
  return false;
};
userSchema.methods.isGameLimit = function () {
  const isSadmin = config.ownerNumber.includes(this.userId);
  if (isSadmin || this.isMaster || this.isVIPActive) return false;

  if (this.limitgame.current <= 0) {
    if (!this.limitgame.warned) {
      this.limitgame.warned = true;
      this.save();
    }
    return true;
  }
  if (this.limitgame.warned) {
    this.limitgame.warned = false;
    this.save();
  }
  return false;
};
userSchema.methods.resetLimits = function () {
  const now = new Date();
  const lastReset = new Date(this.limit.lastReset);
  if (now.getDate() !== lastReset.getDate() || now.getMonth() !== lastReset.getMonth()) {
    this.limit.current = this.isPremium ? 300 : 100;
    this.limitgame.current = this.isPremium ? 300 : 100;
    this.limit.lastReset = now;
    this.limitgame.lastReset = now;
    this.limit.warned = false;
    this.limitgame.warned = false;
    return this.save();
  }
  return this;
};
userSchema.methods.addBalance = async function (amount) {
  const amountBigInt = BigInt(amount);
  const currentBalance = BigInt(this.balance);
  this.balance = (currentBalance + amountBigInt).toString();
  return this.save();
};
userSchema.methods.minBalance = async function (amount) {
  const currentBalance = BigInt(this.balance);
  this.balance = (currentBalance - BigInt(amount)).toString();
  return this.save();
};
userSchema.methods.addXp = async function (xpToAdd = 1) {
  const levelData = [
    { level: 1, xpAdd: 5, threshold: 1250 },
    { level: 2, xpAdd: 4, threshold: 3800 },
    { level: 3, xpAdd: 3, threshold: 5400 },
    { level: 4, xpAdd: 2, threshold: 7600 },
    { level: 5, xpAdd: 1, threshold: 9300 },
    { level: 6, xpAdd: 1, threshold: 12000 },
    { level: 7, xpAdd: 1, threshold: 18000 },
    { level: 8, xpAdd: 1, threshold: 24000 },
    { level: 9, xpAdd: 1, threshold: 30000 },
  ];
  const data = levelData.find(d => d.level === this.level);
  if (!data) return this;
  this.xp += xpToAdd;
  if (this.xp > data.threshold && this.level < 9) {
    this.level += 1;
    await this.save();
    return { levelUp: true, newLevel: this.level };
  }
  await this.save();
  return { levelUp: false, currentLevel: this.level };
};
userSchema.methods.getLevelFormat = function () {
  return {
    xp: `${this.xp}/${this.maxXp}`,
    role: this.levelName,
    balance: this.balance.toString()
  };
};
userSchema.methods.countHit = function () {
  this.userCount += 1;
  return this.save();
};
userSchema.methods.addToInventory = function (itemId, quantity = 1) {
  const currentQty = this.inventory.get(itemId) || 0;
  this.inventory.set(itemId, currentQty + quantity);
  return this.save();
};
userSchema.methods.removeFromInventory = function (itemId, quantity = 1) {
  const currentQty = this.inventory.get(itemId) || 0;
  if (currentQty <= quantity) {
    this.inventory.delete(itemId);
  } else {
    this.inventory.set(itemId, currentQty - quantity);
  }
  return this.save();
};
userSchema.methods.getUserActivityStats = function () {
  const totalCommands = Array.from(this.commandStats.values()).reduce((sum, count) => sum + count, 0);
  return {
    userId: this.userId,
    totalInteractions: this.userCount,
    totalCommands: totalCommands,
    uniqueCommands: this.commandStats.size,
    commandUsage: Object.fromEntries(this.commandStats),
    lastActivity: this.updatedAt,
    accountAgeDays: Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24))
  };
};
userSchema.methods.muteUser = function (userId) {
  this.mutedUsers = this.mutedUsers.filter(user => user.userId !== userId);
  this.mutedUsers.push({
    userId: userId
  });
  return this.save();
};
userSchema.methods.unmuteUser = function (userId) {
  const initialLength = this.mutedUsers.length;
  this.mutedUsers = this.mutedUsers.filter(user => user.userId !== userId);
  if (this.mutedUsers.length !== initialLength) {
    return this.save();
  }
  return this;
};
userSchema.methods.isUserMuted = function (userId) {
  return this.mutedUsers.some(user => user.userId === userId);
};
userSchema.methods.blockUser = function (userId) {
  this.blockedUsers = this.blockedUsers.filter(user => user.userId !== userId);
  this.blockedUsers.push({
    userId: userId
  });
  return this.save();
};
userSchema.methods.unblockUser = function (userId) {
  const initialLength = this.blockedUsers.length;
  this.blockedUsers = this.blockedUsers.filter(user => user.userId !== userId);
  if (this.blockedUsers.length !== initialLength) {
    return this.save();
  }
  return this;
};
userSchema.methods.isUserBlocked = function (userId) {
  return this.blockedUsers.some(user => user.userId === userId);
};
userSchema.methods.clearAllMutedUsers = function () {
  if (this.mutedUsers.length > 0) {
    this.mutedUsers = [];
    return this.save();
  }
  return this;
};
userSchema.methods.clearAllBlockedUsers = function () {
  if (this.blockedUsers.length > 0) {
    this.blockedUsers = [];
    return this.save();
  }
  return this;
};

userSchema.statics.getUserStats = async function () {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [totalUsers, activeUsers] = await Promise.all([
    this.countDocuments(),
    this.countDocuments({
      updatedAt: { $gte: sevenDaysAgo }
    })
  ]);
  return { totalUsers, activeUsers };
};
userSchema.statics.ensureUser = async function (userId) {
  return this.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId } },
    { upsert: true, new: true }
  );
};
userSchema.statics.getExpiredPremiumUsers = function () {
  return this.find({
    isPremium: true,
    premiumExpired: { $ne: null, $lte: new Date() }
  });
};
userSchema.statics.getExpiredVIPUsers = function () {
  return this.find({
    isVIP: true,
    vipExpired: { $ne: null, $lte: new Date() }
  });
};
userSchema.statics.addMaster = async function (userId) {
  return this.findOneAndUpdate(
    { userId },
    {
      $set: {
        isMaster: true
      },
      $setOnInsert: {
        userId
      }
    },
    {
      upsert: true,
      new: true
    }
  );
};
userSchema.statics.addPremium = async function (userId, durationMs) {
  const user = await this.findOneAndUpdate(
    { userId },
    {
      $set: { isPremium: true },
      $inc: { __v: 1 }
    },
    { new: true, upsert: true }
  );
  const newExpiry = (user.premiumExpired && user.premiumExpired > new Date() ? user.premiumExpired.getTime() : Date.now()) + durationMs;
  user.premiumExpired = new Date(newExpiry);
  return user.save();
};
userSchema.statics.addVIP = async function (userId, durationMs) {
  const user = await this.findOneAndUpdate(
    { userId },
    {
      $set: { isVIP: true },
      $inc: { __v: 1 }
    },
    { new: true, upsert: true }
  );
  const newExpiry = (user.vipExpired && user.vipExpired > new Date() ? user.vipExpired.getTime() : Date.now()) + durationMs;
  user.vipExpired = new Date(newExpiry);
  return user.save();
};
userSchema.statics.removeMaster = async function (userId) {
  return this.findOneAndUpdate(
    { userId },
    {
      $set: {
        isMaster: false
      }
    },
    { new: true }
  );
};
userSchema.statics.removePremium = function (userId) {
  return this.updateOne({ userId }, {
    $set: {
      isPremium: false,
      premiumExpired: null,
      'limit.current': 100,
      'limitgame.current': 100
    }
  });
};
userSchema.statics.removeVIP = function (userId) {
  return this.updateOne({ userId }, {
    $set: { isVIP: false, vipExpired: null }
  });
};
userSchema.statics.getLeaderboard = function (type = 'xp', limit = 20) {
  let sortCriteria = {};
  switch (type) {
    case 'xp':
      sortCriteria = { xp: -1, level: -1 };
      break;
    case 'balance':
      sortCriteria = { balance: -1 };
      break;
    case 'level':
      sortCriteria = { level: -1, xp: -1 };
      break;
    default:
      sortCriteria = { xp: -1 };
  }
  return this.find().sort(sortCriteria).limit(limit);
};
userSchema.statics.getUserRank = async function (userId, type = 'xp') {
  let sortCriteria = {};
  switch (type) {
    case 'xp':
      sortCriteria = { xp: -1, level: -1 };
      break;
    case 'balance':
      sortCriteria = { balance: -1 };
      break;
    case 'level':
      sortCriteria = { level: -1, xp: -1 };
      break;
    default:
      sortCriteria = { xp: -1 };
  }
  const users = await this.find().sort(sortCriteria);
  const rank = users.findIndex(user => user.userId === userId);
  return rank >= 0 ? rank + 1 : null;
};
userSchema.statics.findActiveVIPs = function () {
  return this.find({
    isVIP: true,
    vipExpired: { $gt: new Date() }
  });
};
userSchema.statics.findActivePremiums = function () {
  return this.find({
    isPremium: true,
    premiumExpired: { $gt: new Date() }
  });
};
userSchema.statics.getMasterUsers = function () {
  return this.find({ isMaster: true });
};
userSchema.statics.getTopActiveUsers = function (limit = 10) {
  return this.aggregate([
    {
      $addFields: {
        totalActivity: {
          $add: [
            "$userCount",
            { $size: { $objectToArray: "$commandStats" } }
          ]
        }
      }
    },
    {
      $sort: { totalActivity: -1 }
    },
    {
      $limit: limit
    },
    {
      $project: {
        userId: 1,
        userCount: 1,
        commandCount: { $size: { $objectToArray: "$commandStats" } },
        totalActivity: 1,
        isPremium: 1,
        isVIP: 1,
        isMaster: 1
      }
    }
  ]);
};
userSchema.statics.getActiveUserCount = function (days = 30) {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - days);
  return this.countDocuments({
    $or: [
      { updatedAt: { $gte: dateThreshold } },
      { 'limit.lastReset': { $gte: dateThreshold } },
      { 'limitgame.lastReset': { $gte: dateThreshold } }
    ]
  });
};
userSchema.statics.isUserMuted = async function (userId) {
  const settings = await this.getSettings();
  return settings.mutedUsers.some(user => user.userId === userId);
};
userSchema.statics.isUserBlocked = async function (userId) {
  const settings = await this.getSettings();
  return settings.blockedUsers.some(user => user.userId === userId);
};
userSchema.statics.getMutedUsers = async function () {
  const settings = await this.getSettings();
  return settings.mutedUsers;
};
userSchema.statics.getBlockedUsers = async function () {
  const settings = await this.getSettings();
  return settings.blockedUsers;
};

userSchema.index({ 'mutedUsers.userId': 1 });
userSchema.index({ 'blockedUsers.userId': 1 });

export default mongoose.model('User', userSchema);