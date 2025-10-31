// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import mongoose from 'mongoose';
import whitelistSchema from './schema.js';

import { statics as whitelistStatics } from './methods/whitelistLogic.js';

Object.assign(whitelistSchema.statics, whitelistStatics);

const Whitelist = mongoose.model('Whitelist', whitelistSchema);

export default Whitelist;
