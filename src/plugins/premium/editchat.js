// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { DatabaseBot } from '../../../database/index.js';

export const command = {
  name: 'editchat',
  category: 'premium',
  description: 'Mengubah balasan dari kata kunci auto-reply. Bisa dengan cara membalas pesan.',
  aliases: ['updatechat'],
  isCommandWithoutPayment: true,
  execute: async ({ sReply, arg, quotedMsg, m }) => {
    try {
      let keyword = '';
      let newReplyText = '';
      const isQuotedText = quotedMsg && (m.quoted.type === 'extendedTextMessage' || m.quoted.type === 'conversation');
      if (isQuotedText) {
        keyword = arg.trim().toLowerCase();
        newReplyText = m.quoted.body.trim();
        if (!keyword) return sReply('Gagal! Anda harus memberikan keyword untuk teks balasan baru ini.\nContoh: .editchat sapaan');
      } else {
        if (!arg || !arg.includes('|')) return sReply('Gagal! Gunakan salah satu format:\n\n1. Balas pesan teks dengan:\n`.editchat <keyword>`\n\n2. Ketik langsung:\n`.editchat <keyword>|<balasan_baru>`');
        const parts = arg.split('|');
        keyword = parts.shift().trim().toLowerCase();
        newReplyText = parts.join('|').trim();
      }
      if (!keyword || !newReplyText) return sReply('Gagal! Keyword dan balasan baru tidak boleh kosong.');
      if (/chat\.whatsapp\.com|instagram\.com|youtube\.com|youtu\.be|tiktok\.com/i.test(keyword) || /chat\.whatsapp\.com|instagram\.com|youtube\.com|youtu\.be|tiktok\.com/i.test(newReplyText)) return sReply("Keyword atau Teks Balasan tidak boleh mengandung link.");
      const db = await DatabaseBot.getDatabase();
      await db.editChat(keyword, newReplyText);
      await sReply(`✅ Auto-reply berhasil diubah!\n\n*Keyword:* ${keyword}\n*Balasan Baru:* ${newReplyText}`);
    } catch (error) {
      await sReply(`Terjadi kesalahan: ${error.message}`);
    }
  },
};