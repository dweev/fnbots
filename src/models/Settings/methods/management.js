/**
 * @file src/models/Settings/methods/management.js
 * Mengelola metode dan statis untuk pengaturan manajemen.
 * Created with ❤️ and 💦 By FN
 */

export const methods = {
  toggleMaintenance() {
    this.maintenance = !this.maintenance;
    return this.save();
  },
  updatePrefix(newPrefix) {
    this.rname = newPrefix;
    this.sname = newPrefix === '.' ? '/' : newPrefix;
    return this.save();
  },
  toggleSetting(settingName) {
    if (typeof this[settingName] === 'boolean') {
      this[settingName] = !this[settingName];
      return this.save();
    }
    return this;
  },
  setDataM(key, value) {
    this.dataM.set(key, value);
    this.markModified('dataM');
    return this.save();
  },
  getDataM(key) {
    return this.dataM.get(key);
  },
  deleteDataM(key) {
    this.dataM.delete(key);
    this.markModified('dataM');
    return this.save();
  },
  clearDataM() {
    this.dataM.clear();
    this.markModified('dataM');
    return this.save();
  },
  updateLimitSettings(limitCount, limitGame, limitCountPrem, memberLimit) {
    if (limitCount !== undefined) this.limitCount = limitCount;
    if (limitGame !== undefined) this.limitGame = limitGame;
    if (limitCountPrem !== undefined) this.limitCountPrem = limitCountPrem;
    if (memberLimit !== undefined) this.memberLimit = memberLimit;
    return this.save();
  }
};
