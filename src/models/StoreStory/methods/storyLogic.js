/**
 * @file src/models/StoreStory/methods/storyLogic.js
 * Mengelola metode dan statis untuk logika cerita.
 * Created with ❤️ and 💦 By FN
 */

import config from '../../../../config.js';

export const statics = {
  addStatus(userId, statusObject, maxSize = 20) {
    return this.findOneAndUpdate(
      { userId: userId },
      {
        $push: {
          statuses: {
            $each: [statusObject],
            $slice: -maxSize
          }
        },
        $set: { lastUpdatedAt: new Date() }
      },
      { upsert: true, new: true }
    );
  },
  deleteStatus(userId, messageId) {
    return this.updateOne({ userId: userId }, { $pull: { statuses: { 'key.id': messageId } } });
  },
  bulkDeleteStatuses(userId, messageIds) {
    if (!messageIds || messageIds.length === 0) {
      return Promise.resolve({ modifiedCount: 0 });
    }
    return this.updateOne(
      { userId: userId },
      {
        $pull: {
          statuses: {
            'key.id': { $in: messageIds }
          }
        }
      }
    );
  },
  async cleanupOldData() {
    const FIFTEEN_DAYS_AGO = new Date(Date.now() - config.performance.fifteenDays);
    return this.deleteMany({ lastUpdatedAt: { $lt: FIFTEEN_DAYS_AGO } });
  }
};
