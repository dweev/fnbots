// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { Command } from '../../../database/index.js';

export const command = {
  name: 'resetcommands',
  category: 'owner',
  description: 'Menghapus semua perintah yang telah disimpan di database.',
  isCommandWithoutPayment: true,
  aliases: ['resetcmd'],
  isEnabled: true,
  execute: async ({ sReply }) => {
    const result = await Command.resetAll();
    await sReply(`Berhasil! Sebanyak ${result.deletedCount} data perintah telah dihapus dari database. Silakan restart bot untuk menyegarkan cache menu.`);
  }
};
