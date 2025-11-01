/**
 * @file src/models/Whitelist/methods/whitelistLogic.js
 * Mengelola metode dan statis untuk logika daftar putih.
 * Created with ❤️ and 💦 By FN
 */

import log from '../../../lib/logger.js';

export const statics = {
  async isWhitelisted(targetId, type = null) {
    if (!targetId) return false;
    if (!type) {
      type = targetId.endsWith('@g.us') ? 'group' : 'user';
    }
    try {
      const result = await this.exists({ type, targetId: targetId.toLowerCase() });
      return !!result;
    } catch (error) {
      log(`Error in isWhitelisted: ${error}`, true);
      return false;
    }
  },
  async addToWhitelist(targetId, type = null) {
    if (!targetId) return null;
    if (!type) {
      type = targetId.endsWith('@g.us') ? 'group' : 'user';
    }
    const filter = { type, targetId: targetId.toLowerCase() };
    const update = { $setOnInsert: { type, targetId: targetId.toLowerCase() } };
    const options = { upsert: true, new: true };
    try {
      return await this.findOneAndUpdate(filter, update, options);
    } catch (error) {
      log(`Error in addToWhitelist: ${error}`, true);
      return null;
    }
  },
  removeFromWhitelist(targetId, type = null) {
    if (!targetId) return null;
    if (!type) {
      type = targetId.endsWith('@g.us') ? 'group' : 'user';
    }
    return this.deleteOne({ type, targetId: targetId.toLowerCase() });
  },
  getWhitelistedGroups() {
    return this.find({ type: 'group' });
  },
  getWhitelistedUsers() {
    return this.find({ type: 'user' });
  },
  clearAll(type = null) {
    const filter = type ? { type } : {};
    return this.deleteMany(filter);
  }
};
