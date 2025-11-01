/**
 * @file src/models/Group/methods/queries.js
 * Metode statis untuk kueri database terkait grup.
 * Created with ❤️ and 💦 By FN
 */

export const statics = {
  ensureGroup(groupId) {
    return this.findOneAndUpdate({ groupId }, { $setOnInsert: { groupId } }, { upsert: true, new: true });
  },
  findBySetting(settingName, value = true) {
    return this.find({ [settingName]: value });
  },
  findGroupsWithAfkUsers() {
    return this.find({ 'afkUsers.0': { $exists: true } });
  },
  findUserAfkStatus(userId) {
    return this.find({ 'afkUsers.userId': userId }).select('groupId groupName afkUsers.$');
  },
  getGroupStats() {
    return this.aggregate([
      {
        $group: {
          _id: null,
          totalGroups: { $sum: 1 },
          activeGroups: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
          totalMembers: { $sum: '$memberCount' },
          totalMessages: { $sum: '$messageCount' },
          totalCommands: { $sum: '$commandCount' },
          totalAfkUsers: { $sum: { $size: '$afkUsers' } }
        }
      }
    ]);
  },
  cleanupOldAfkUsers(maxAfkHours = 24) {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - maxAfkHours);
    return this.updateMany(
      {},
      {
        $pull: { afkUsers: { time: { $lt: cutoffDate } } }
      }
    );
  }
};
