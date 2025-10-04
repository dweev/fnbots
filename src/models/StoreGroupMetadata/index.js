// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import mongoose from 'mongoose';
import groupMetadataSchema from './schema.js';

import { methods as syncMethods, statics as syncStatics } from './methods/sync.js';

Object.assign(
  groupMetadataSchema.methods,
  syncMethods
);

Object.assign(
  groupMetadataSchema.statics,
  syncStatics
);

const StoreGroupMetadata = mongoose.model('StoreGroupMetadata', groupMetadataSchema);

export default StoreGroupMetadata;