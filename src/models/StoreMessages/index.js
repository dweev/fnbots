// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import mongoose from 'mongoose';
import messagesSchema from './schema.js';

import { statics as messageStatics } from './methods/messageLogic.js';

Object.assign(
  messagesSchema.statics,
  messageStatics
);

const StoreMessages = mongoose.model('StoreMessages', messagesSchema);

export default StoreMessages;