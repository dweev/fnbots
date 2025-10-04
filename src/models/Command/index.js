// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import mongoose from 'mongoose';
import commandSchema from './schema.js';

import { methods as managementMethods, statics as managementStatics } from './methods/management.js';
import { statics as aliasStatics } from './methods/alias.js';
import { statics as statsStatics } from './methods/stats.js';

Object.assign(
  commandSchema.methods,
  managementMethods
);
Object.assign(
  commandSchema.statics,
  managementStatics,
  aliasStatics,
  statsStatics
);

const Command = mongoose.model('Command', commandSchema);

export default Command;