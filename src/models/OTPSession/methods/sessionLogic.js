// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const statics = {
  createSession(userId, groupId, otp) {
    return this.findOneAndUpdate(
      { userId, groupId },
      {
        otp,
        attempts: 0,
        isBlocked: false,
        expireAt: new Date(Date.now() + 5 * 60 * 1000)
      },
      { upsert: true, new: true }
    );
  },
  async verifyOTP(userId, inputOTP) {
    const session = await this.findOne({ userId, isBlocked: false });
    if (!session) {
      return { success: false, reason: 'SESSION_NOT_FOUND' };
    }
    if (session.otp === inputOTP) {
      await this.deleteOne({ _id: session._id });
      return { success: true, groupId: session.groupId, reason: 'OTP_VERIFIED' };
    }
    session.attempts += 1;
    if (session.attempts >= 4) {
      session.isBlocked = true;
      await session.save();
      return { success: false, reason: 'MAX_ATTEMPTS_EXCEEDED', attempts: session.attempts };
    }
    await session.save();
    return { success: false, reason: 'WRONG_OTP', attempts: session.attempts };
  },
  getSession(userId) {
    return this.findOne({ userId, isBlocked: false });
  },
  deleteSession(userId) {
    return this.deleteOne({ userId });
  },
  async cleanupExpired() {
    const result = await this.deleteMany({ expireAt: { $lt: new Date() } });
    return result.deletedCount;
  },
  getBlockedUsers() {
    return this.find({ isBlocked: true }).select('userId');
  },
  unblockUser(userId) {
    return this.deleteOne({ userId, isBlocked: true });
  }
};

export const methods = {
  isExpired() {
    return new Date() > this.expireAt;
  },

  getRemainingTime() {
    const now = new Date();
    const remaining = this.expireAt.getTime() - now.getTime();
    return Math.max(0, Math.floor(remaining / 1000));
  }
};