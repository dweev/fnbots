// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { DatabaseBot } from '../../../database/index.js';

export const command = {
  name: 'addchat',
  category: 'premium',
  description: 'Menambahkan kata kunci auto-reply baru. Bisa dengan cara membalas pesan.',
  isCommandWithoutPayment: true,
  execute: async ({ sReply, arg, quotedMsg, m }) => {
    try {
      let keyword = '';
      let replyText = '';
      const isQuotedText = quotedMsg && (m.quoted.type === 'extendedTextMessage' || m.quoted.type === 'conversation');
      if (isQuotedText) {
        keyword = arg.trim().toLowerCase();
        replyText = m.quoted.body.trim();
        if (!keyword) return sReply('Gagal! Anda harus memberikan keyword untuk teks yang dibalas.\nContoh: .addchat sapaan');
      } else {
        if (!arg || !arg.includes('|')) return sReply('Gagal! Gunakan salah satu format:\n\n1. Balas pesan teks dengan:\n`.addchat <keyword>`\n\n2. Ketik langsung:\n`.addchat <keyword>|<balasan>`');
        const parts = arg.split('|');
        keyword = parts.shift().trim().toLowerCase();
        replyText = parts.join('|').trim();
      }
      if (!keyword || !replyText) return sReply('Gagal! Keyword dan balasan tidak boleh kosong.');
      if (/chat\.whatsapp\.com|instagram\.com|youtube\.com|youtu\.be|tiktok\.com/i.test(keyword) || /chat\.whatsapp\.com|instagram\.com|youtube\.com|youtu\.be|tiktok\.com/i.test(replyText)) return sReply("Keyword atau Teks Balasan tidak boleh mengandung link.");
      const db = await DatabaseBot.getDatabase();
      await db.addChat(keyword, replyText);
      await sReply(`✅ Auto-reply berhasil ditambahkan!\n\n*Keyword:* ${keyword}\n*Balasan:* ${replyText}`);
    } catch (error) {
      await sReply(`Terjadi kesalahan: ${error.message}`);
    }
  },
};