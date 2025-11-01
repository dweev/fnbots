/**
 * @file src/models/StoreContact/index.js
 * Mengelola model kontak dan skema.
 * Created with ❤️ and 💦 By FN
 */

import mongoose from 'mongoose';
import contactSchema from './schema.js';
import { methods as contactMethods, statics as contactStatics } from './methods/contactLogic.js';

Object.assign(contactSchema.methods, contactMethods);
Object.assign(contactSchema.statics, contactStatics);

const StoreContact = mongoose.model('StoreContact', contactSchema);

export default StoreContact;
