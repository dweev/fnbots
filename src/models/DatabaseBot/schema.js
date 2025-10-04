// ─── Info ─────────────────────────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info src/models/DatabaseBot/schema.js ────────────────────────────

import mongoose from 'mongoose';

const databaseBotSchema = new mongoose.Schema({
  docId: {
    type: String,
    default: 'DATABASE_BOT_SINGLETON',
    unique: true,
    required: true,
    index: true,
  },
  chat: { type: Map, of: String, default: {} },
  bacot: { type: [String], default: [] },
}, {
  timestamps: true,
});

export default databaseBotSchema;