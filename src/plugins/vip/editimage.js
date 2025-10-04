// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Media } from '../../../database/index.js';

export const command = {
  name: 'editimage',
  category: 'vip',
  description: 'Mengganti gambar di database dengan yang baru.',
  aliases: ['updateimage'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, sReply, arg, quotedMsg }) => {
    const name = arg.trim().toLowerCase();
    if (!name || /chat\.whatsapp\.com|instagram\.com|youtube\.com|youtu\.be|tiktok\.com/i.test(name)) return await sReply(`Nama gambar tidak valid.\n\nGunakan nama unik untuk gambar.\nContoh: .editimage fnbots`);
    const targetMsg = quotedMsg ? m.quoted || m : m.message;
    const mime = targetMsg?.imageMessage?.mimetype;
    const gambar = await Media.findOne({ name: name, type: 'image' });
    if (gambar) return await sReply(`Gagal! Nama gambar '${name}' sudah digunakan.`);
    const buffer = await fn.getMediaBuffer(targetMsg);
    const result = await Media.findOneAndUpdate(
      { name: name, type: 'image' },
      { data: buffer, mime: mime },
      { new: true }
    );
    if (result) {
      await sReply(`✅ gambar '${name}' berhasil diperbarui.`);
    } else {
      await sReply(`gambar dengan nama '${name}' tidak ditemukan. Mungkin Anda ingin membuatnya dengan .addimage?`);
    }
  },
};
