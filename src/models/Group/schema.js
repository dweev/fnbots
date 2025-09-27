// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import mongoose from 'mongoose';

const { Schema } = mongoose;

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
  welcome: {
    state: { type: Boolean, default: false, index: true },
    pesan: { type: String, default: '' },
    templateId: { type: String, default: null }
  },
  leave: {
    state: { type: Boolean, default: false, index: true },
    pesan: { type: String, default: '' },
    templateId: { type: String, default: null }
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
  verifyMember: {
    type: Boolean,
    default: false
  },
  memberCount: {
    type: Number,
    default: 0
  },
  warnings: {
    type: new Schema({
      users: { type: Map, of: Number, default: {} },
      state: { type: Boolean, default: true },
      count: { type: Number, default: 100 }
    }, { _id: false }),
    default: {}
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
  bannedMembers: {
    type: [String],
    default: []
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
  if (!this.warnings || !this.warnings.users) return 0;
  return Array.from(this.warnings.users.values()).reduce((sum, count) => sum + count, 0);
});
groupSchema.virtual('activeMemberCount').get(function () { return this.memberCount - this.bannedMembers.length; });
groupSchema.virtual('afkCount').get(function () { return this.afkUsers.length; });

groupSchema.index({ lastActivity: -1 });
groupSchema.index({ memberCount: -1 });
groupSchema.index({ 'afkUsers.userId': 1 });
groupSchema.index({ 'warnings.state': 1 });

groupSchema.pre('save', function (next) {
  if (this.isModified()) {
    this.lastActivity = new Date();
  }
  if (!this.warnings) {
    this.warnings = { users: new Map(), state: true, count: 5 };
  }
  next();
});

groupSchema.set('toJSON', { virtuals: true });
groupSchema.set('toObject', { virtuals: true });

export default groupSchema;