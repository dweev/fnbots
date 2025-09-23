// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info OtpSession.js ──────────────────

import mongoose from 'mongoose';

const otpSessionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
    validate: {
      validator: function (v) {
        return v.includes('@s.whatsapp.net');
      },
      message: 'User ID must be a valid WhatsApp JID'
    }
  },
  groupId: {
    type: String,
    required: true,
    index: true,
    validate: {
      validator: function (v) {
        return v.endsWith('@g.us');
      },
      message: 'Group ID must end with @g.us'
    }
  },
  otp: {
    type: String,
    required: true,
    length: 6
  },
  attempts: {
    type: Number,
    default: 0,
    max: 4
  },
  isBlocked: {
    type: Boolean,
    default: false,
    index: true
  },
  expireAt: {
    type: Date,
    default: () => new Date(Date.now() + 5 * 60 * 1000),
    expires: 0
  }
}, {
  timestamps: true
});

otpSessionSchema.index({ userId: 1, groupId: 1 }, { unique: true });

otpSessionSchema.statics.createSession = async function (userId, groupId, otp) {
  return await this.findOneAndUpdate(
    { userId, groupId },
    {
      otp,
      attempts: 0,
      isBlocked: false,
      expireAt: new Date(Date.now() + 5 * 60 * 1000)
    },
    { upsert: true, new: true }
  );
};
otpSessionSchema.statics.verifyOTP = async function (userId, inputOTP) {
  const session = await this.findOne({ userId, isBlocked: false });
  if (!session) {
    return { success: false, reason: 'SESSION_NOT_FOUND' };
  }
  if (session.otp === inputOTP) {
    await this.deleteOne({ _id: session._id });
    return {
      success: true,
      groupId: session.groupId,
      reason: 'OTP_VERIFIED'
    };
  }
  session.attempts += 1;
  if (session.attempts >= 4) {
    session.isBlocked = true;
    await session.save();
    return {
      success: false,
      reason: 'MAX_ATTEMPTS_EXCEEDED',
      attempts: session.attempts
    };
  }
  await session.save();
  return {
    success: false,
    reason: 'WRONG_OTP',
    attempts: session.attempts
  };
};
otpSessionSchema.statics.getSession = async function (userId) {
  return await this.findOne({ userId, isBlocked: false });
};
otpSessionSchema.statics.deleteSession = async function (userId) {
  return await this.deleteOne({ userId });
};
otpSessionSchema.statics.cleanupExpired = async function () {
  const result = await this.deleteMany({
    expireAt: { $lt: new Date() }
  });
  return result.deletedCount;
};
otpSessionSchema.statics.getBlockedUsers = async function () {
  return await this.find({ isBlocked: true }).select('userId');
};
otpSessionSchema.statics.unblockUser = async function (userId) {
  return await this.deleteOne({ userId, isBlocked: true });
};

otpSessionSchema.methods.isExpired = function () {
  return new Date() > this.expireAt;
};
otpSessionSchema.methods.getRemainingTime = function () {
  const now = new Date();
  const remaining = this.expireAt.getTime() - now.getTime();
  return Math.max(0, Math.floor(remaining / 1000));
};

export default mongoose.model('OTPSession', otpSessionSchema);