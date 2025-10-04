// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

export const statics = {
  async incrementTotalHitCount(amount = 1) {
    const settings = await this.getSettings();
    settings.totalHitCount += amount;
    return settings.save();
  }
};