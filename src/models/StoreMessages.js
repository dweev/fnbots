// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info StoreMessages.js ───────────────

import mongoose from 'mongoose';
import config from '../../config.js';

const ConversationSchema = new mongoose.Schema({
  sender: String,
  text: String,
  name: String,
  timestamp: Number,
  quoted: String,
  quotedSender: String,
  keyId: {
    type: String,
  }
}, { _id: false });

const messagesSchema = new mongoose.Schema({
  chatId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  messages: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
  },
  conversations: {
    type: [ConversationSchema],
    default: [],
  },
  presences: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, {
  timestamps: true,
});

messagesSchema.index({
  "chatId": 1,
  "conversations.keyId": 1
}, {
  unique: true,
  sparse: true,
  partialFilterExpression: {
    "conversations.keyId": { $exists: true, $ne: null }
  }
});

messagesSchema.statics.addMessage = function (chatId, messageObject, maxSize = 50) {
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
};
messagesSchema.statics.addConversation = function (chatId, conversationObject, maxSize = 200) {
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
};
messagesSchema.statics.updatePresences = function (chatId, presenceObject) {
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
};
messagesSchema.statics.cleanupOldData = async function () {
  const FIFTEEN_DAYS_AGO = new Date(Date.now() - config.performance.fifteenDays);
  return this.deleteMany({ lastUpdatedAt: { $lt: FIFTEEN_DAYS_AGO } });
};
messagesSchema.statics.getLatestMessage = async function (chatId) {
  const chat = await this.findOne(
    { chatId: chatId },
    { messages: { $slice: -1 } }
  ).lean();
  return chat?.messages?.[0] || null;
};

export default mongoose.model('StoreMessages', messagesSchema);