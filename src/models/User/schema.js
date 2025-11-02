// ─── Info ────────────────────────────────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info src/models/User/schema.js ──────────────────────────────────

import mongoose from 'mongoose';
import { Settings } from '../../../database/index.js';

const userSchema = new mongoose.Schema(
  {
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
    warnedExpired: {
      type: Boolean,
      default: false
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
      default: '0',
      get: (v) => BigInt(v),
      set: (v) => v.toString()
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
    mutedUsers: [
      {
        userId: {
          type: String,
          required: true
        }
      }
    ]
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      getters: true
    },
    toObject: {
      virtuals: true,
      getters: true
    }
  }
);

userSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('isPremium')) {
    const dbSettings = Settings.getSettings();
    this.limit.current = this.isPremium ? dbSettings.limitCountPrem : dbSettings.limitCount;
    this.limitgame.current = this.isPremium ? dbSettings.limitCountPrem : dbSettings.limitGame;
  }
  next();
});

userSchema.virtual('mutedUsersCount').get(function () {
  return this.mutedUsers.length;
});
userSchema.virtual('isVIPActive').get(function () {
  return !!(this.isVIP && this.vipExpired && this.vipExpired > new Date());
});
userSchema.virtual('isPremiumActive').get(function () {
  return !!(this.isPremium && this.premiumExpired && this.premiumExpired > new Date());
});

const xpThresholds = [0, 1250, 3800, 5400, 7600, 9300, 12000, 18000, 24000, 30000];
userSchema.virtual('maxXp').get(function () {
  return xpThresholds[this.level] || 50000;
});

const levelNames = [null, 'Beginner', 'Intermediate', 'Public', 'Pro', 'Expert', 'Master', 'Grandmaster', 'Epic', 'Legend'];
userSchema.virtual('levelName').get(function () {
  return levelNames[this.level] || 'Mythic';
});

userSchema.index({ 'mutedUsers.userId': 1 });

export default userSchema;
