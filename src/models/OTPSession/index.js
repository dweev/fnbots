// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import mongoose from 'mongoose';
import otpSessionSchema from './schema.js';

import { statics as sessionStatics, methods as sessionMethods } from './methods/sessionLogic.js';

Object.assign(
  otpSessionSchema.statics,
  sessionStatics
);

Object.assign(
  otpSessionSchema.methods,
  sessionMethods
);

const OTPSession = mongoose.model('OTPSession', otpSessionSchema);

export default OTPSession;