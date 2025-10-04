// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Settings } from '../../../database/index.js';

export const command = {
  name: 'autosticker',
  category: 'owner',
  description: 'Mengaktifkan atau menonaktifkan mode autosticker. setiap ada media seperti image, video, gif',
  isCommandWithoutPayment: true,
  execute: async ({ dbSettings, reactDone, args, sReply }) => {
    const mode = (args[0] || '').toLowerCase();
    if (!['on', 'off'].includes(mode)) return await sReply(`gunakan perintah dengan benar, contoh: ${dbSettings.rname}autosticker on/off`);
    dbSettings.autosticker = mode === 'on';
    await Settings.updateSettings(dbSettings);
    await reactDone();
  }
};