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
  },
  addedBy: {
    type: String,
    required: true,
    validate: {
      validator: function (v) {
        return v.endsWith('@s.whatsapp.net');
      },
      message: 'AddedBy must be a valid user ID'
    }
  },
  reason: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

whitelistSchema.index({ type: 1, targetId: 1 }, { unique: true });
whitelistSchema.pre('save', function (next) {
  this.targetId = this.targetId.toLowerCase();
  this.addedBy = this.addedBy.toLowerCase();
  next();
});
whitelistSchema.statics.isWhitelisted = async function (targetId, type = null) {
  if (!type) {
    type = targetId.endsWith('@g.us') ? 'group' : 'user';
  }
  return await this.exists({ type, targetId });
};
whitelistSchema.statics.addToWhitelist = async function (targetId, addedBy, reason = '', type = null) {
  if (!type) {
    type = targetId.endsWith('@g.us') ? 'group' : 'user';
  }
  const whitelist = new this({
    type,
    targetId,
    addedBy,
    reason
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
whitelistSchema.methods.updateReason = function (newReason) {
  this.reason = newReason;
  return this.save();
};

export default mongoose.model('Whitelist', whitelistSchema);