// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Media } from '../../../database/index.js';

export const command = {
  name: 'editsticker',
  category: 'vip',
  description: 'Mengganti stiker di database dengan yang baru.',
  aliases: ['updatesticker'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, sReply, arg, quotedMsg }) => {
    const name = arg.trim().toLowerCase();
    if (!name || /chat\.whatsapp\.com|instagram\.com|youtube\.com|youtu\.be|tiktok\.com/i.test(name)) return await sReply(`Nama stiker tidak valid.\n\nGunakan nama unik untuk stiker.\nContoh: .editsticker fnbots`);
    const targetMsg = quotedMsg ? m.quoted || m : m.message;
    const mime = targetMsg?.imageMessage?.mimetype || targetMsg?.videoMessage?.mimetype || targetMsg?.stickerMessage?.mimetype;
    if ((mime === "video/mp4" || mime === "image/gif") && quotedMsg.seconds > 20) return await sReply(`Durasi video terlalu panjang. Maksimal 20 detik.`);
    const existingSticker = await Media.findOne({ name: name, type: 'sticker' });
    if (existingSticker) return await sReply(`Gagal! Nama stiker '${name}' sudah digunakan.`);
    const buffer = await fn.getMediaBuffer(targetMsg);
    const result = await Media.findOneAndUpdate(
      { name: name, type: 'sticker' },
      { data: buffer, mime: mime },
      { new: true }
    );
    if (result) {
      await sReply(`Stiker '${name}' berhasil diperbarui.`);
    } else {
      await sReply(`Stiker dengan nama '${name}' tidak ditemukan. Mungkin Anda ingin membuatnya dengan .addsticker?`);
    }
  },
};
