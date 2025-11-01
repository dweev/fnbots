/**
 * @file src/models/StoreGroupMetadata/index.js
 * Mengelola model metadata grup dan skema.
 * Created with ❤️ and 💦 By FN
 */

import mongoose from 'mongoose';
import groupMetadataSchema from './schema.js';
import { methods as syncMethods, statics as syncStatics } from './methods/sync.js';

Object.assign(groupMetadataSchema.methods, syncMethods);
Object.assign(groupMetadataSchema.statics, syncStatics);

const StoreGroupMetadata = mongoose.model('StoreGroupMetadata', groupMetadataSchema);

export default StoreGroupMetadata;
