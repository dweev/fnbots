/**
 * @file src/models/StoreMessages/index.js
 * Mengelola model pesan dan skema.
 * Created with ❤️ and 💦 By FN
 */

import mongoose from 'mongoose';
import messagesSchema from './schema.js';
import { statics as messageStatics } from './methods/messageLogic.js';

Object.assign(messagesSchema.statics, messageStatics);

const StoreMessages = mongoose.model('StoreMessages', messagesSchema);

export default StoreMessages;
