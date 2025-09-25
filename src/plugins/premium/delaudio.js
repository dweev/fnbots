// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Media } from '../../../database/index.js';

export const command = {
  name: 'delaudio',
  category: 'premium',
  description: 'Menghapus audio dari database berdasarkan nama.',
  aliases: ['deleteaudio'],
  isCommandWithoutPayment: true,
  execute: async ({ sReply, arg }) => {
    const name = arg.trim().toLowerCase();
    if (!name) return sReply('Gagal! Berikan nama audio yang ingin dihapus.\nContoh: .delaudio fnbots');
    const result = await Media.deleteOne({ name: name, type: 'audio' });
    if (result.deletedCount > 0) {
      await sReply(`✅ audio '${name}' berhasil dihapus dari database.`);
    } else {
      await sReply(`audio dengan nama '${name}' tidak ditemukan.`);
    }
  },
};