// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { Media } from '../../../database/index.js';

export const command = {
  name: 'addsticker',
  category: 'vip',
  description: 'Menyimpan stiker ke database dengan nama kunci.',
  aliases: ['savesticker'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, sReply, arg, quotedMsg }) => {
    const name = arg.trim().toLowerCase();
    if (!name || /chat\.whatsapp\.com|instagram\.com|youtube\.com|youtu\.be|tiktok\.com/i.test(name)) return await sReply(`Nama stiker tidak valid.\n\nGunakan nama unik untuk stiker.\nContoh: .addsticker fnbots`);
    const targetMsg = quotedMsg ? m.quoted || m : m.message;
    const mime = targetMsg?.imageMessage?.mimetype || targetMsg?.videoMessage?.mimetype || targetMsg?.stickerMessage?.mimetype;
    if ((mime === 'video/mp4' || mime === 'image/gif') && quotedMsg.seconds > 20) return await sReply(`Durasi video terlalu panjang. Maksimal 20 detik.`);
    const existingSticker = await Media.findOne({ name: name, type: 'sticker' });
    if (existingSticker) return await sReply(`Gagal! Nama stiker '${name}' sudah digunakan.`);
    const buffer = await fn.getMediaBuffer(targetMsg);
    await Media.create({
      name: name,
      type: 'sticker',
      mime: mime,
      data: buffer
    });
    await sReply(`Stiker '${name}' berhasil disimpan.`);
  }
};
