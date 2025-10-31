// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { Settings } from '../../../database/index.js';

export const command = {
  name: 'autoreadstory',
  category: 'owner',
  description: 'Mengaktifkan atau menonaktifkan mode autoreadstory.',
  aliases: ['autoreadsw'],
  isCommandWithoutPayment: true,
  execute: async ({ dbSettings, reactDone, args, sReply }) => {
    const mode = (args[0] || '').toLowerCase();
    if (!['on', 'off'].includes(mode)) return await sReply(`gunakan perintah dengan benar, contoh: ${dbSettings.rname}autoreadstory on/off`);
    dbSettings.autoreadsw = mode === 'on';
    await Settings.updateSettings(dbSettings);
    await reactDone();
  }
};
