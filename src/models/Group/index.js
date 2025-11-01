/**
 * @file src/models/Group/index.js
 * Mengelola model grup dan skema.
 * Created with ❤️ and 💦 By FN
 */

import mongoose from 'mongoose';
import groupSchema from './schema.js';
import { methods as afkMethods } from './methods/afk.js';
import { statics as queryStatics } from './methods/queries.js';
import { methods as warningMethods } from './methods/warning.js';
import { methods as settingsMethods } from './methods/settings.js';
import { methods as moderationMethods } from './methods/moderation.js';

Object.assign(groupSchema.methods, settingsMethods, afkMethods, warningMethods, moderationMethods);
Object.assign(groupSchema.statics, queryStatics);

const Group = mongoose.model('Group', groupSchema);

export default Group;
