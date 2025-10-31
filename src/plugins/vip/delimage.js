// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { Media } from '../../../database/index.js';

export const command = {
  name: 'delimage',
  category: 'vip',
  description: 'Menghapus gambar dari database berdasarkan nama.',
  aliases: ['deleteimage'],
  isCommandWithoutPayment: true,
  execute: async ({ sReply, arg }) => {
    const name = arg.trim().toLowerCase();
    if (!name) return sReply('Gagal! Berikan nama gambar yang ingin dihapus.\nContoh: .delimage fnbots');
    const result = await Media.deleteOne({ name: name, type: 'image' });
    if (result.deletedCount > 0) {
      await sReply(`gambar '${name}' berhasil dihapus dari database.`);
    } else {
      await sReply(`gambar dengan nama '${name}' tidak ditemukan.`);
    }
  }
};
