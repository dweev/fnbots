// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

export const statics = {
  async getSettings() {
    let settings = await this.findOne();
    if (!settings) {
      settings = new this();
      await settings.save();
    }
    return settings;
  },
  async updateSettings(updates) {
    const settings = await this.getSettings();
    Object.assign(settings, updates);
    return settings.save();
  }
};
