// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import mongoose from 'mongoose';

const otpSessionSchema = new mongoose.Schema({
  userId: {
    type: String, required: true, index: true,
    validate: { validator: (v) => v.includes('@s.whatsapp.net'), message: 'User ID must be a valid WhatsApp JID' }
  },
  groupId: {
    type: String, required: true, index: true,
    validate: { validator: (v) => v.endsWith('@g.us'), message: 'Group ID must end with @g.us' }
  },
  otp: { type: String, required: true, length: 6 },
  attempts: { type: Number, default: 0, max: 4 },
  isBlocked: { type: Boolean, default: false, index: true },
  expireAt: {
    type: Date,
    default: () => new Date(Date.now() + 5 * 60 * 1000),
    expires: 0
  }
}, { timestamps: true });

otpSessionSchema.index({ userId: 1, groupId: 1 }, { unique: true });

export default otpSessionSchema;