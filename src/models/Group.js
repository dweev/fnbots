// ─── Info ────────────────────────────────
/*
  * Created with ❤️ and 💦 By FN
  * Follow https://github.com/Terror-Machine
  * Feel Free To Use
*/
// ─── Info Group.js ───────────────────────

import mongoose from 'mongoose';

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
  welcomeMessage: {
    type: String,
    default: ''
  },
  leaveMessage: {
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
  warnings: {
    type: Map,
    of: Number,
    default: {}
  },
  verifyMember: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

groupSchema.virtual('warningCount').get(function () {
  return Array.from(this.warnings.values()).reduce((sum, count) => sum + count, 0);
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
groupSchema.statics.findBySetting = function (settingName, value = true) {
  return this.find({ [settingName]: value });
};
groupSchema.statics.findGroupsWithWarnings = function () {
  return this.find({
    $expr: { $gt: [{ $size: { $objectToArray: "$warnings" } }, 0] }
  });
};
groupSchema.set('toJSON', { virtuals: true });
groupSchema.set('toObject', { virtuals: true });

export default mongoose.model('Group', groupSchema);