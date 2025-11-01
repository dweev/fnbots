/**
 * @file src/models/StoreStory/index.js
 * Mengelola model cerita dan skema.
 * Created with ❤️ and 💦 By FN
 */

import mongoose from 'mongoose';
import statusDataSchema from './schema.js';
import { statics as storyStatics } from './methods/storyLogic.js';

Object.assign(statusDataSchema.statics, storyStatics);

const StoreStory = mongoose.model('StoreStory', statusDataSchema);

export default StoreStory;
