// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Settings } from '../../../database/index.js';

export const command = {
  name: 'changelimitpremium',
  displayName: 'changelimit-premium',
  category: 'owner',
  description: 'mengatur limit member premium',
  isCommandWithoutPayment: true,
  aliases: ['changelimit-premium'],
  execute: async ({ dbSettings, reactDone, args, sReply }) => {
    if (args) {
      const limit = parseInt(args[0]);
      if (!limit || limit < 1) return await sReply(`gunakan perintah dengan benar, contoh: ${dbSettings.rname}changelimitpremium 100`);
      dbSettings.limitCountPrem = limit;
      await Settings.updateSettings(dbSettings);
      await reactDone();
    }
  }
};