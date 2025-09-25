// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { DatabaseBot } from '../../../database/index.js';

export const command = {
  name: 'addbacot',
  category: 'premium',
  description: 'Menambahkan teks bacot baru ke database.',
  isCommandWithoutPayment: true,
  execute: async ({ sReply, arg }) => {
    const text = arg.trim();
    if (!text) return await sReply('Gagal! Berikan teks yang ingin ditambahkan.');
    const db = await DatabaseBot.getDatabase();
    await db.addBacot(text);
    await sReply(`✅ Teks bacot baru berhasil ditambahkan.`);
  },
};