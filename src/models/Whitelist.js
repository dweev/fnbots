// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info Whitelist.js ───────────────────

import mongoose from 'mongoose';

const whitelistSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['group', 'user'],
    required: true,
    index: true
  },
  targetId: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        if (this.type === 'group') return v.endsWith('@g.us');
        if (this.type === 'user') return v.endsWith('@s.whatsapp.net');
        return false;
      },
      message: 'Target ID must match type (group: @g.us, user: @s.whatsapp.net)'
    }
  }
}, {
  timestamps: true
});

whitelistSchema.index({ type: 1, targetId: 1 }, { unique: true });
whitelistSchema.pre('save', function (next) {
  this.targetId = this.targetId.toLowerCase();
  next();
});
whitelistSchema.statics.isWhitelisted = async function (targetId, type = null) {
  if (!type) {
    type = targetId.endsWith('@g.us') ? 'group' : 'user';
  }
  const result = await this.exists({ type, targetId: targetId.toLowerCase() });
  return !!result;
};
whitelistSchema.statics.addToWhitelist = async function (targetId, type = null) {
  if (!type) {
    type = targetId.endsWith('@g.us') ? 'group' : 'user';
  }
  const whitelist = new this({
    type,
    targetId
  });
  return await whitelist.save();
};
whitelistSchema.statics.removeFromWhitelist = async function (targetId, type = null) {
  if (!type) {
    type = targetId.endsWith('@g.us') ? 'group' : 'user';
  }
  return await this.deleteOne({ type, targetId });
};
whitelistSchema.statics.getWhitelistedGroups = function () {
  return this.find({ type: 'group' });
};
whitelistSchema.statics.getWhitelistedUsers = function () {
  return this.find({ type: 'user' });
};
whitelistSchema.statics.clearAll = function (type = null) {
  if (type) {
    return this.deleteMany({ type });
  }
  return this.deleteMany({});
};

export default mongoose.model('Whitelist', whitelistSchema);