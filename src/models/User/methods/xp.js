// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

const levelData = [
  { level: 1, threshold: 1250 },
  { level: 2, threshold: 3800 },
  { level: 3, threshold: 5400 },
  { level: 4, threshold: 7600 },
  { level: 5, threshold: 9300 },
  { level: 6, threshold: 12000 },
  { level: 7, threshold: 18000 },
  { level: 8, threshold: 24000 },
  { level: 9, threshold: 30000 }
];

export const methods = {
  async addXp(xpToAdd = 1) {
    this.xp += xpToAdd;
    let leveledUp = false;
    while (this.level < 10) {
      const currentLevelData = levelData.find((d) => d.level === this.level);
      if (!currentLevelData || this.xp < currentLevelData.threshold) {
        break;
      }
      this.level++;
      leveledUp = true;
    }
    await this.save();
    return { levelUp: leveledUp, newLevel: this.level };
  },
  getLevelFormat() {
    return {
      xp: `${this.xp}/${this.maxXp}`,
      role: this.levelName,
      balance: this.balance.toString()
    };
  }
};

export const statics = {
  async getUserRank(userId, type = 'xp') {
    if (type !== 'xp' && type !== 'level') return null;
    const user = await this.findOne({ userId }).lean();
    if (!user) return null;
    const filter = {};
    if (type === 'xp') {
      filter.xp = { $gt: user.xp };
    } else if (type === 'level') {
      filter.$or = [{ level: { $gt: user.level } }, { level: user.level, xp: { $gt: user.xp } }];
    }
    const higherRankCount = await this.countDocuments(filter);
    return higherRankCount + 1;
  }
};
