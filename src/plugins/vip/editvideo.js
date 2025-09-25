// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Media } from '../../../database/index.js';

export const command = {
  name: 'editvideo',
  category: 'premium',
  description: 'Mengganti video di database dengan yang baru.',
  aliases: ['updatevideo'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, sReply, arg, quotedMsg }) => {
    const name = arg.trim().toLowerCase();
    if (!name || /chat\.whatsapp\.com|instagram\.com|youtube\.com|youtu\.be|tiktok\.com/i.test(name)) return await sReply(`Nama video tidak valid.\n\nGunakan nama unik untuk video.\nContoh: .editvideo fnbots`);
    const targetMsg = quotedMsg ? m.quoted || m : m.message;
    const mime = targetMsg?.videoMessage?.mimetype;
    const video = await Media.findOne({ name: name, type: 'video' });
    if (video) return await sReply(`Gagal! Nama video '${name}' sudah digunakan.`);
    const buffer = await fn.getMediaBuffer(targetMsg);
    const result = await Media.findOneAndUpdate(
      { name: name, type: 'video' },
      { data: buffer, mime: mime },
      { new: true }
    );
    if (result) {
      await sReply(`✅ video '${name}' berhasil diperbarui.`);
    } else {
      await sReply(`video dengan nama '${name}' tidak ditemukan. Mungkin Anda ingin membuatnya dengan .addvideo?`);
    }
  },
};
