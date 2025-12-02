// ─── Info ─────────────────────────────────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info src/models/Whitelist/schema.js ──────────────────────────────

import mongoose from 'mongoose';

const whitelistSchema = new mongoose.Schema(
  {
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
    expiredAt: {
      type: Date,
      default: null
    },
    warnedExpired: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true
    },
    toObject: {
      virtuals: true
    }
  }
);

whitelistSchema.pre('save', function () {
  this.groupId = this.groupId.toLowerCase();
});

whitelistSchema.virtual('isActive').get(function () {
  if (!this.expiredAt) return true;
  return this.expiredAt > new Date();
});

whitelistSchema.virtual('isPermanent').get(function () {
  return this.expiredAt === null;
});

export default whitelistSchema;
