/**
 * @file src/models/User/methods/membership.js
 * Mengelola metode dan statis untuk logika keanggotaan pengguna.
 * Created with ❤️ and 💦 By FN
 */

import { Settings } from '../../../../database/index.js';

async function addMembership(user, type, durationMs) {
  const fieldMap = {
    premium: { is: 'isPremium', expiry: 'premiumExpired' },
    vip: { is: 'isVIP', expiry: 'vipExpired' }
  };
  const fields = fieldMap[type];
  if (!fields) throw new Error('Invalid membership type');
  user[fields.is] = true;
  user.warnedExpired = false;
  const currentExpiry = user[fields.expiry];
  const newExpiry = (currentExpiry && currentExpiry > new Date() ? currentExpiry.getTime() : Date.now()) + durationMs;
  user[fields.expiry] = new Date(newExpiry);
  return user.save();
}

export const statics = {
  getExpiredPremiumUsers() {
    return this.find({ isPremium: true, premiumExpired: { $ne: null, $lte: new Date() } });
  },
  getExpiredVIPUsers() {
    return this.find({ isVIP: true, vipExpired: { $ne: null, $lte: new Date() } });
  },
  getUsersNearPremiumExpiry() {
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return this.find({
      isPremium: true,
      premiumExpired: {
        $ne: null,
        $gt: now,
        $lte: sevenDaysLater
      },
      warnedExpired: false
    });
  },
  getUsersNearVIPExpiry() {
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return this.find({
      isVIP: true,
      vipExpired: {
        $ne: null,
        $gt: now,
        $lte: sevenDaysLater
      },
      warnedExpired: false
    });
  },
  getMasters() {
    return this.find({ isMaster: true });
  },
  addMaster(userId) {
    return this.findOneAndUpdate({ userId }, { $set: { isMaster: true } }, { upsert: true, new: true });
  },
  async addPremium(userId, durationMs) {
    const user = await this.findOneAndUpdate({ userId }, { $set: { isPremium: true, warnedExpired: false } }, { new: true, upsert: true });
    return addMembership(user, 'premium', durationMs);
  },
  async addVIP(userId, durationMs) {
    const user = await this.findOneAndUpdate({ userId }, { $set: { isVIP: true, warnedExpired: false } }, { new: true, upsert: true });
    return addMembership(user, 'vip', durationMs);
  },
  removeMaster(userId) {
    return this.findOneAndUpdate({ userId }, { $set: { isMaster: false } }, { new: true });
  },
  removePremium(userId) {
    const dbSettings = Settings.getSettings();
    return this.updateOne(
      { userId },
      {
        $set: {
          isPremium: false,
          premiumExpired: null,
          warnedExpired: false,
          'limit.current': dbSettings.limitCount,
          'limitgame.current': dbSettings.limitGame
        }
      }
    );
  },
  removeVIP(userId) {
    return this.updateOne({ userId }, { $set: { isVIP: false, vipExpired: null, warnedExpired: false } });
  },
  async setExpiredWarning(userId) {
    try {
      const result = await this.findOneAndUpdate({ userId, warnedExpired: false }, { $set: { warnedExpired: true } }, { new: true });
      return result !== null;
    } catch (error) {
      throw new Error(`Failed to set warning for ${userId}: ${error.message}`);
    }
  }
};
