// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { Media } from '../../../database/index.js';

export const command = {
  name: 'delsticker',
  category: 'vip',
  description: 'Menghapus stiker dari database berdasarkan nama.',
  aliases: ['deletesticker'],
  isCommandWithoutPayment: true,
  execute: async ({ sReply, arg }) => {
    const name = arg.trim().toLowerCase();
    if (!name) return sReply('Gagal! Berikan nama stiker yang ingin dihapus.\nContoh: .delsticker fnbots');
    const result = await Media.deleteOne({ name: name, type: 'sticker' });
    if (result.deletedCount > 0) {
      await sReply(`Stiker '${name}' berhasil dihapus dari database.`);
    } else {
      await sReply(`Stiker dengan nama '${name}' tidak ditemukan.`);
    }
  }
};
