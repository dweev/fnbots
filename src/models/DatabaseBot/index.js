// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import mongoose from 'mongoose';
import databaseBotSchema from './schema.js';

import { methods as chatMethods } from './methods/chat.js';
import { methods as bacotMethods } from './methods/bacot.js';
import { statics as singletonStatics } from './methods/singleton.js';

Object.assign(databaseBotSchema.methods, chatMethods, bacotMethods);

Object.assign(databaseBotSchema.statics, singletonStatics);

const DatabaseBot = mongoose.model('DatabaseBot', databaseBotSchema);

export default DatabaseBot;
