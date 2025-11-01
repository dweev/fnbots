/**
 * @file src/models/Command/index.js
 * Mengelola model perintah dan skema.
 * Created with ❤️ and 💦 By FN
 */

import mongoose from 'mongoose';
import commandSchema from './schema.js';
import { statics as aliasStatics } from './methods/alias.js';
import { statics as statsStatics } from './methods/stats.js';
import { methods as managementMethods, statics as managementStatics } from './methods/management.js';

Object.assign(commandSchema.methods, managementMethods);
Object.assign(commandSchema.statics, managementStatics, aliasStatics, statsStatics);

const Command = mongoose.model('Command', commandSchema);

export default Command;
