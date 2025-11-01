/**
 * @file src/models/Whitelist/index.js
 * Mengelola model whitelist dan skema.
 * Created with ❤️ and 💦 By FN
 */

import mongoose from 'mongoose';
import whitelistSchema from './schema.js';
import { statics as whitelistStatics } from './methods/whitelistLogic.js';

Object.assign(whitelistSchema.statics, whitelistStatics);

const Whitelist = mongoose.model('Whitelist', whitelistSchema);

export default Whitelist;
