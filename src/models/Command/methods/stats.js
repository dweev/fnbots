/**
 * @file src/models/Command/methods/stats.js
 * Metode statis untuk mendapatkan statistik penggunaan perintah.
 * Created with ❤️ and 💦 By FN
 */

export const statics = {
  updateCount(commandName, amount = 1) {
    return this.findOneAndUpdate({ name: commandName.toLowerCase() }, { $inc: { count: amount } }, { upsert: true, new: true });
  },
  getTopCommands(limit = 10) {
    return this.find().sort({ count: -1 }).limit(limit);
  },
  getCommandsByCategory(category, limit = 20) {
    return this.find({ category }).sort({ count: -1 }).limit(limit);
  },
  getCommandStats() {
    return this.aggregate([
      {
        $group: {
          _id: '$category',
          totalCommands: { $sum: 1 },
          totalUsage: { $sum: '$count' },
          averageUsage: { $avg: '$count' }
        }
      }
    ]);
  }
};
