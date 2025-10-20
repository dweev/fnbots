// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Media } from '../../../database/index.js';

export const command = {
  name: 'editaudio',
  category: 'vip',
  description: 'Mengganti audio di database dengan yang baru.',
  aliases: ['updateaudio'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, sReply, arg, quotedMsg }) => {
    const name = arg.trim().toLowerCase();
    if (!name || /chat\.whatsapp\.com|instagram\.com|youtube\.com|youtu\.be|tiktok\.com/i.test(name)) return await sReply(`Nama audio tidak valid.\n\nGunakan nama unik untuk audio.\nContoh: .editaudio fnbots`);
    const targetMsg = quotedMsg ? m.quoted || m : m.message;
    const mime = targetMsg?.audioMessage?.mimetype;
    const audio = await Media.findOne({ name: name, type: 'audio' });
    if (audio) return await sReply(`Gagal! Nama audio '${name}' sudah digunakan.`);
    const buffer = await fn.getMediaBuffer(targetMsg);
    const result = await Media.findOneAndUpdate(
      { name: name, type: 'audio' },
      { data: buffer, mime: mime },
      { new: true }
    );
    if (result) {
      await sReply(`audio '${name}' berhasil diperbarui.`);
    } else {
      await sReply(`audio dengan nama '${name}' tidak ditemukan. Mungkin Anda ingin membuatnya dengan .addaudio?`);
    }
  },
};
