// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import mongoose from 'mongoose';
import statusDataSchema from './schema.js';

import { statics as storyStatics } from './methods/storyLogic.js';

Object.assign(statusDataSchema.statics, storyStatics);

const StoreStory = mongoose.model('StoreStory', statusDataSchema);

export default StoreStory;
