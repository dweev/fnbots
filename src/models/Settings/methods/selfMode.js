/**
 * @file src/models/Settings/methods/selfMode.js
 * Mengelola metode dan statis untuk mode self pada pengaturan.
 * Created with ❤️ and 💦 By FN
 */

const validModes = ['true', 'false', 'auto'];

export const methods = {
  setSelfMode(mode) {
    if (!validModes.includes(mode)) throw new Error('Mode self harus: true, false, atau auto');
    this.self = mode;
    return this.save();
  },
  toggleSelfMode() {
    const currentIndex = validModes.indexOf(this.self);
    this.self = validModes[(currentIndex + 1) % validModes.length];
    return this.save();
  }
};

export const statics = {
  async setSelfMode(mode) {
    const settings = await this.getSettings();
    return settings.setSelfMode(mode);
  },
  async toggleSelfMode() {
    const settings = await this.getSettings();
    return settings.toggleSelfMode();
  }
};
