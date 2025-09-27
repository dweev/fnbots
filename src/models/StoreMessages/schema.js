// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import mongoose from 'mongoose';

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

export default messagesSchema;