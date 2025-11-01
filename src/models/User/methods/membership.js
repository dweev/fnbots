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
  getMasters() {
    return this.find({ isMaster: true });
  },
  addMaster(userId) {
    return this.findOneAndUpdate({ userId }, { $set: { isMaster: true } }, { upsert: true, new: true });
  },
  async addPremium(userId, durationMs) {
    const user = await this.findOneAndUpdate({ userId }, { $set: { isPremium: true } }, { new: true, upsert: true });
    return addMembership(user, 'premium', durationMs);
  },
  async addVIP(userId, durationMs) {
    const user = await this.findOneAndUpdate({ userId }, { $set: { isVIP: true } }, { new: true, upsert: true });
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
          'limit.current': dbSettings.limitCount,
          'limitgame.current': dbSettings.limitGame
        }
      }
    );
  },
  removeVIP(userId) {
    return this.updateOne({ userId }, { $set: { isVIP: false, vipExpired: null } });
  }
};
