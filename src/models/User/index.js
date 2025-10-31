// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import mongoose from 'mongoose';
import userSchema from './schema.js';

import { methods as limitMethods } from './methods/limit.js';
import { methods as xpMethods, statics as xpStatics } from './methods/xp.js';
import { methods as economyMethods, statics as economyStatics } from './methods/economy.js';
import { statics as membershipStatics } from './methods/membership.js';
import { methods as moderationMethods } from './methods/moderation.js';
import { methods as statsMethods, statics as statsStatics } from './methods/stats.js';

Object.assign(userSchema.methods, limitMethods, xpMethods, economyMethods, moderationMethods, statsMethods);

Object.assign(userSchema.statics, xpStatics, economyStatics, membershipStatics, statsStatics);

userSchema.statics.ensureUser = async function (userId, retries = 3) {
  if (!userId || typeof userId !== 'string' || !userId.includes('@')) {
    return new this({ userId: 'invalid@s.whatsapp.net' });
  }
  for (let i = 0; i < retries; i++) {
    try {
      return await this.findOneAndUpdate({ userId }, { $setOnInsert: { userId } }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
    } catch (error) {
      if (error.code === 11000) {
        const user = await this.findOne({ userId });
        if (user) return user;
        if (i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100 * (i + 1)));
          continue;
        }
      }
      throw error;
    }
  }
};

const User = mongoose.model('User', userSchema);

export default User;
