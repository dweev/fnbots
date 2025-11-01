/**
 * @file src/models/Settings/methods/stats.js
 * Mengelola metode dan statis untuk statistik pada pengaturan.
 * Created with ❤️ and 💦 By FN
 */

export const statics = {
  async incrementTotalHitCount(amount = 1) {
    const settings = await this.getSettings();
    settings.totalHitCount += amount;
    return settings.save();
  }
};
