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
  },
  {
    timestamps: true
  }
);

whitelistSchema.index({ type: 1, targetId: 1 }, { unique: true });

whitelistSchema.pre('save', function (next) {
  this.targetId = this.targetId.toLowerCase();
  next();
});

export default whitelistSchema;
