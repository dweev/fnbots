// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Settings } from '../../../database/index.js';

export const command = {
  name: 'autocorrect',
  category: 'master',
  description: 'Mengaktifkan atau menonaktifkan mode autocorrect.',
  aliases: ['suggest'],
  isCommandWithoutPayment: true,
  execute: async ({ dbSettings, reactDone, args, sReply }) => {
    const mode = (args[0] || '').toLowerCase();
    const modes = { on: 1, auto: 2, off: 0 };
    if (!(mode in modes)) return await sReply(`gunakan perintah dengan benar, contoh: ${dbSettings.rname}autocorrect on/auto/off`);
    dbSettings.autocorrect = modes[mode];
    await Settings.updateSettings(dbSettings);
    await reactDone();
  }
};