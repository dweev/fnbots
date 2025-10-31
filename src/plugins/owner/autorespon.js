// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { Settings } from '../../../database/index.js';

export const command = {
  name: 'autorespon',
  category: 'owner',
  description: 'Mengaktifkan atau menonaktifkan mode autorespon bot.',
  isCommandWithoutPayment: true,
  execute: async ({ dbSettings, reactDone, args, sReply }) => {
    const mode = (args[0] || '').toLowerCase();
    if (!['on', 'off'].includes(mode)) return await sReply(`gunakan perintah dengan benar, contoh: ${dbSettings.rname}autorespon on/off`);
    dbSettings.chatbot = mode === 'on';
    await Settings.updateSettings(dbSettings);
    await reactDone();
  }
};
