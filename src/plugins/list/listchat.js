// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { DatabaseBot } from '../../../database/index.js';

export const command = {
  name: 'listchat',
  category: 'list',
  description: 'Menampilkan semua daftar auto-reply teks.',
  isCommandWithoutPayment: true,
  execute: async ({ sReply }) => {
    const db = await DatabaseBot.getDatabase();
    const chatMap = db.chat;
    if (chatMap.size === 0) return await sReply('Tidak ada data auto-reply teks yang tersimpan di database.');
    let listText = `*❏ DAFTAR AUTO-REPLY TEKS ❏*\n\nTotal: ${chatMap.size} balasan\n`;
    let i = 1;
    for (const [keyword] of chatMap.entries()) {
      listText += `\n*${i++}. Keyword:* \`${keyword}\`\n`;
    }
    await sReply(listText.trim());
  },
};