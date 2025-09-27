// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const statics = {
  async isWhitelisted(targetId, type = null) {
    if (!type) {
      type = targetId.endsWith('@g.us') ? 'group' : 'user';
    }
    const result = await this.exists({ type, targetId: targetId.toLowerCase() });
    return !!result;
  },

  async addToWhitelist(targetId, type = null) {
    if (!type) {
      type = targetId.endsWith('@g.us') ? 'group' : 'user';
    }
    const whitelistEntry = new this({ type, targetId });
    return await whitelistEntry.save();
  },

  async removeFromWhitelist(targetId, type = null) {
    if (!type) {
      type = targetId.endsWith('@g.us') ? 'group' : 'user';
    }
    return await this.deleteOne({ type, targetId: targetId.toLowerCase() });
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