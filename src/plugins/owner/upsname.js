// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Settings } from '../../../database/index.js';

export const command = {
  name: 'upsname',
  category: 'owner',
  description: 'mengganti prefix bot',
  isCommandWithoutPayment: true,
  execute: async ({ dbSettings, reactDone, arg, sReply }) => {
    if (!arg) return await sReply(`gunakan perintah dengan benar, contoh: ${dbSettings.sname}upsname prefixbaru`);
    dbSettings.sname = arg;
    await Settings.updateSettings(dbSettings);
    await reactDone();
  }
};