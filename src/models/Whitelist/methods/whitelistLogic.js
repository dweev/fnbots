/**
 * @file src/models/Whitelist/methods/whitelistLogic.js
 * Mengelola metode dan statis untuk logika daftar putih.
 * Created with ❤️ and 💦 By FN
 */

import log from '../../../lib/logger.js';

export const statics = {
  async isWhitelisted(groupId) {
    if (!groupId || !groupId.endsWith('@g.us')) return false;
    try {
      const whitelist = await this.findOne({ groupId: groupId.toLowerCase() });
      if (!whitelist) return false;
      if (!whitelist.expiredAt) return true;
      return whitelist.expiredAt > new Date();
    } catch (error) {
      log(`Error in isWhitelisted: ${error}`, true);
      return false;
    }
  },
  async addToWhitelist(groupId, durationMs = null) {
    if (!groupId || !groupId.endsWith('@g.us')) return null;
    try {
      const existing = await this.findOne({ groupId: groupId.toLowerCase() });
      if (existing) {
        existing.warnedExpired = false;
        if (durationMs) {
          const currentExpiry = existing.expiredAt;
          const newExpiry = (currentExpiry && currentExpiry > new Date() ? currentExpiry.getTime() : Date.now()) + durationMs;
          existing.expiredAt = new Date(newExpiry);
        } else {
          existing.expiredAt = null;
        }
        return await existing.save();
      }
      const expiredAt = durationMs ? new Date(Date.now() + durationMs) : null;
      return await this.create({
        groupId: groupId.toLowerCase(),
        expiredAt,
        warnedExpired: false
      });
    } catch (error) {
      log(`Error in addToWhitelist: ${error}`, true);
      return null;
    }
  },
  removeFromWhitelist(groupId) {
    if (!groupId || !groupId.endsWith('@g.us')) return null;
    return this.deleteOne({ groupId: groupId.toLowerCase() });
  },
  getWhitelistedGroups() {
    return this.find({});
  },
  getActiveWhitelistedGroups() {
    return this.find({
      $or: [{ expiredAt: null }, { expiredAt: { $gt: new Date() } }]
    });
  },
  getExpiredGroups() {
    return this.find({
      expiredAt: { $ne: null, $lte: new Date() }
    });
  },
  getGroupsNearExpiry() {
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return this.find({
      expiredAt: {
        $ne: null,
        $gt: now,
        $lte: sevenDaysLater
      },
      warnedExpired: false
    });
  },
  async setExpiredWarning(groupId) {
    try {
      const result = await this.findOneAndUpdate({ groupId: groupId.toLowerCase(), warnedExpired: false }, { $set: { warnedExpired: true } }, { new: true });
      return result !== null;
    } catch (error) {
      throw new Error(`Failed to set warning for ${groupId}: ${error.message}`);
    }
  },
  clearAll() {
    return this.deleteMany({});
  }
};
