// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import mongoose from 'mongoose';
import settingsSchema from './schema.js';

import { methods as selfModeMethods, statics as selfModeStatics } from './methods/selfMode.js';
import { methods as adminMethods, statics as adminStatics } from './methods/admin.js';
import { methods as managementMethods } from './methods/management.js';
import { statics as singletonStatics } from './methods/singleton.js';
import { statics as statsStatics } from './methods/stats.js';

Object.assign(settingsSchema.methods, selfModeMethods, adminMethods, managementMethods);

Object.assign(settingsSchema.statics, singletonStatics, selfModeStatics, adminStatics, statsStatics);

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;
