// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import config from '../../../../config.js';

export const statics = {
  addMessage(chatId, messageObject, maxSize = 50) {
    return this.findOneAndUpdate(
      { chatId: chatId },
      {
        $push: {
          messages: {
            $each: [messageObject],
            $slice: -maxSize
          }
        },
        $set: { lastUpdatedAt: new Date() }
      },
      { upsert: true, new: true }
    );
  },
  addConversation(chatId, conversationObject, maxSize = 200) {
    return this.findOneAndUpdate(
      { chatId: chatId },
      {
        $push: {
          conversations: {
            $each: [conversationObject],
            $slice: -maxSize
          }
        },
        $set: { lastUpdatedAt: new Date() }
      },
      { upsert: true, new: true }
    );
  },
  updatePresences(chatId, presenceObject) {
    const updateQuery = {};
    for (const jid in presenceObject) {
      updateQuery[`presences.${jid}`] = presenceObject[jid];
    }
    return this.findOneAndUpdate(
      { chatId: chatId },
      {
        $set: {
          ...updateQuery,
          lastUpdatedAt: new Date()
        }
      },
      { upsert: true, new: true }
    );
  },
  async cleanupOldData() {
    const FIFTEEN_DAYS_AGO = new Date(Date.now() - config.performance.fifteenDays);
    return this.deleteMany({ lastUpdatedAt: { $lt: FIFTEEN_DAYS_AGO } });
  },
  async getLatestMessage(chatId) {
    const chat = await this.findOne(
      { chatId: chatId },
      { messages: { $slice: -1 } }
    ).lean();
    return chat?.messages?.[0] || null;
  }
};