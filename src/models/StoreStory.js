// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info StoreStory.js ──────────────────

import mongoose from 'mongoose';

const statusDataSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  statuses: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: true,
});

statusDataSchema.statics.addStatus = function (userId, statusObject, maxSize = 20) {
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
};
statusDataSchema.statics.deleteStatus = function (userId, messageId) {
  return this.updateOne(
    { userId: userId },
    { $pull: { statuses: { 'key.id': messageId } } }
  );
};
statusDataSchema.statics.cleanupOldData = async function () {
  const FIFTEEN_DAYS_AGO = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
  return this.deleteMany({ lastUpdatedAt: { $lt: FIFTEEN_DAYS_AGO } });
};

export default mongoose.model('StoreStory', statusDataSchema);