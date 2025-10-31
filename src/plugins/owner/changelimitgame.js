// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { Settings } from '../../../database/index.js';

export const command = {
  name: 'changelimitgame',
  displayName: 'changelimit-game',
  category: 'owner',
  description: 'mengatur limit permainan',
  isCommandWithoutPayment: true,
  aliases: ['changelimit-game'],
  execute: async ({ dbSettings, reactDone, args, sReply }) => {
    if (args) {
      const limit = parseInt(args[0]);
      if (!limit || limit < 1) return await sReply(`gunakan perintah dengan benar, contoh: ${dbSettings.rname}changelimitgame 100`);
      dbSettings.limitGame = limit;
      await Settings.updateSettings(dbSettings);
      await reactDone();
    }
  }
};
