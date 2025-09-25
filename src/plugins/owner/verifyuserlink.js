// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Settings } from '../../../database/index.js';

export const command = {
  name: 'verifyuserlink',
  category: 'owner',
  description: 'mengatur link group untuk verifyuser.',
  isCommandWithoutPayment: true,
  execute: async ({ dbSettings, arg, args, reactDone, sReply }) => {
    if (!arg) return await sReply(`gunakan perintah dengan benar, contoh: ${dbSettings.rname}verifyuserlink link group baru`);
    dbSettings.linkIdentity = args[0].trim();
    await Settings.updateSettings(dbSettings);
    await reactDone();
  }
};