// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

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