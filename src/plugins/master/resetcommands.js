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
  category: 'master',
  description: 'Menghapus semua data perintah dari database.',
  aliases: ['resetcmd'],
  execute: async ({ sReply }) => {
    const result = await Command.resetAll();
    await sReply(`Berhasil! Sebanyak ${result.deletedCount} data perintah telah dihapus dari database. Silakan restart bot untuk menyegarkan cache menu.`);
  }
};