// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { DatabaseBot } from '../../../database/index.js';

export const command = {
  name: 'delchat',
  category: 'premium',
  description: 'Menghapus kata kunci auto-reply.',
  isCommandWithoutPayment: true,
  execute: async ({ sReply, arg }) => {
    const keyword = arg.trim().toLowerCase();
    if (!keyword) return sReply('Gagal! Berikan keyword yang ingin dihapus.\nContoh: .delchat hai');
    const db = await DatabaseBot.getDatabase();
    await db.deleteChat(keyword);
    await sReply(`Auto-reply untuk keyword "${keyword}" berhasil dihapus.`);
  }
};
