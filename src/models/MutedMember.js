// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info MutedMember.js ───────────────────────

import mongoose from 'mongoose';

const mutedMemberSchema = new mongoose.Schema({
  groupId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  expireAt: {
    type: Date,
    required: true,
    index: { expires: '0s' }
  }
}, {
  timestamps: true
});

mutedMemberSchema.index({ groupId: 1, userId: 1 });

export default mongoose.model('MutedMember', mutedMemberSchema);