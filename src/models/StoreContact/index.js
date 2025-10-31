// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import mongoose from 'mongoose';
import contactSchema from './schema.js';

import { methods as contactMethods, statics as contactStatics } from './methods/contactLogic.js';

Object.assign(contactSchema.methods, contactMethods);

Object.assign(contactSchema.statics, contactStatics);

const StoreContact = mongoose.model('StoreContact', contactSchema);

export default StoreContact;
