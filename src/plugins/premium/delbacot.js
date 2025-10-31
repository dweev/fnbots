// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { DatabaseBot } from '../../../database/index.js';

export const command = {
  name: 'delbacot',
  category: 'premium',
  description: 'Menghapus teks bacot dari database.',
  isCommandWithoutPayment: true,
  execute: async ({ sReply, arg }) => {
    const text = arg.trim();
    if (!text) return await sReply('Gagal! Berikan teks yang ingin dihapus.');
    const db = await DatabaseBot.getDatabase();
    await db.deleteBacot(text);
    await sReply(`Teks bacot berhasil dihapus.`);
  }
};
