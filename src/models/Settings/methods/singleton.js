/**
 * @file src/models/Settings/methods/singleton.js
 * Mengelola metode dan statis singleton untuk pengaturan.
 * Created with ❤️ and 💦 By FN
 */

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
