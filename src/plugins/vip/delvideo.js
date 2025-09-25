// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Media } from '../../../database/index.js';

export const command = {
  name: 'delvideo',
  category: 'vip',
  description: 'Menghapus video dari database berdasarkan nama.',
  aliases: ['deletevideo'],
  isCommandWithoutPayment: true,
  execute: async ({ sReply, arg }) => {
    const name = arg.trim().toLowerCase();
    if (!name) return sReply('Gagal! Berikan nama video yang ingin dihapus.\nContoh: .delvideo fnbots');
    const result = await Media.deleteOne({ name: name, type: 'video' });
    if (result.deletedCount > 0) {
      await sReply(`✅ video '${name}' berhasil dihapus dari database.`);
    } else {
      await sReply(`video dengan nama '${name}' tidak ditemukan.`);
    }
  },
};