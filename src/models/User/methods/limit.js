// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import config from '../../../../config.js';
import { getDbSettings } from '../../../lib/settingsManager.js';

export const methods = {
  async isLimit() {
    if (config.ownerNumber.includes(this.userId) || this.isMaster || this.isVIPActive) return false;
    if (this.limit.current <= 0) {
      if (!this.limit.warned) {
        this.limit.warned = true;
        await this.constructor.updateOne({ userId: this.userId }, { $set: { 'limit.warned': true } });
      }
      return true;
    }
    return false;
  },
  async isGameLimit() {
    if (config.ownerNumber.includes(this.userId) || this.isMaster || this.isVIPActive) return false;
    if (this.limitgame.current <= 0) {
      if (!this.limitgame.warned) {
        this.limitgame.warned = true;
        await this.constructor.updateOne({ userId: this.userId }, { $set: { 'limitgame.warned': true } });
      }
      return true;
    }
    return false;
  },
  resetLimits() {
    const dbSettings = getDbSettings();
    const now = new Date();
    const lastReset = new Date(this.limit.lastReset);
    if (now.getDate() !== lastReset.getDate() || now.getMonth() !== lastReset.getMonth()) {
      this.limit.current = this.isPremium ? dbSettings.limitCountPrem : dbSettings.limitCount;
      this.limitgame.current = this.isPremium ? dbSettings.limitCountPrem : dbSettings.limitGame;
      this.limit.lastReset = now;
      this.limitgame.lastReset = now;
      this.limit.warned = false;
      this.limitgame.warned = false;
      return this.save();
    }
    return this;
  }
};