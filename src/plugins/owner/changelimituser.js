// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Settings } from '../../../database/index.js';

export const command = {
  name: 'changelmituser',
  category: 'owner',
  description: 'mengatur limit member',
  isCommandWithoutPayment: true,
  execute: async ({ dbSettings, reactDone, args, sReply }) => {
    if (args) {
      const limit = parseInt(args[0]);
      if (!limit || limit < 1) return await sReply(`gunakan perintah dengan benar, contoh: ${dbSettings.rname}changelmituser 100`);
      dbSettings.limitCount = limit;
      await Settings.updateSettings(dbSettings);
      await reactDone();
    }
  }
};