// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Settings } from '../../../database/index.js';

export const command = {
  name: 'uptext',
  category: 'owner',
  description: 'mengganti text informasi bot',
  isCommandWithoutPayment: true,
  execute: async ({ dbSettings, reactDone, arg, sReply }) => {
    if (!arg) return await sReply(`gunakan perintah dengan benar, contoh: ${dbSettings.rname}uptext teksbaru`);
    dbSettings.autocommand = arg;
    await Settings.updateSettings(dbSettings);
    await reactDone();
  }
};