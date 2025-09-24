// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Settings } from '../../../database/index.js';

export const command = {
  name: 'verifyusergid',
  category: 'owner',
  description: 'mengatur id group untuk verifyuser.',
  execute: async ({ dbSettings, arg, args, reactDone, sReply }) => {
    if (!arg) return await sReply(`gunakan perintah dengan benar, contoh: ${dbSettings.rname}verifyusergid groupId baru`);
    dbSettings.groupIdentity = args[0].trim();
    await Settings.updateSettings(dbSettings);
    await reactDone();
  }
};