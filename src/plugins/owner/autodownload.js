// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { Settings } from '../../../database/index.js';

export const command = {
  name: 'autodownload',
  category: 'owner',
  description: 'Mengaktifkan atau menonaktifkan mode autodownload media.',
  isCommandWithoutPayment: true,
  execute: async ({ dbSettings, reactDone, args, sReply }) => {
    const mode = (args[0] || '').toLowerCase();
    if (!['on', 'off'].includes(mode)) return await sReply(`gunakan perintah dengan benar, contoh: ${dbSettings.rname}autodownload on/off`);
    dbSettings.autodownload = mode === 'on';
    await Settings.updateSettings(dbSettings);
    await reactDone();
  }
};
