/**
 * @file src/models/User/methods/stats.js
 * Mengelola metode dan statis untuk logika statistik pengguna.
 * Created with ❤️ and 💦 By FN
 */

export const methods = {
  addCommandCount(commandName, count = 1) {
    const currentCount = this.commandStats.get(commandName) || 0;
    this.commandStats.set(commandName, currentCount + count);
    this.markModified('commandStats');
    return this.save();
  },
  countHit() {
    this.userCount += 1;
    return this.save();
  },
  getUserActivityStats() {
    const totalCommands = Array.from(this.commandStats.values()).reduce((sum, count) => sum + count, 0);
    return {
      userId: this.userId,
      totalInteractions: this.userCount,
      totalCommands: totalCommands,
      uniqueCommands: this.commandStats.size,
      commandUsage: Object.fromEntries(this.commandStats),
      lastActivity: this.updatedAt,
      accountAgeDays: Math.floor((new Date() - this.createdAt) / (1000 * 60 * 60 * 24))
    };
  }
};

export const statics = {
  async getUserStats() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [totalUsers, activeUsers] = await Promise.all([this.countDocuments(), this.countDocuments({ updatedAt: { $gte: sevenDaysAgo } })]);
    return { totalUsers, activeUsers };
  },
  getTopActiveUsers(limit = 10) {
    return this.aggregate([{ $addFields: { totalActivity: { $add: ['$userCount', { $size: { $ifNull: [{ $objectToArray: '$commandStats' }, []] } }] } } }, { $sort: { totalActivity: -1 } }, { $limit: limit }]);
  }
};
