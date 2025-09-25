// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Media } from '../../../database/index.js';

export const command = {
  name: 'addimage',
  category: 'premium',
  description: 'Menyimpan gambar ke database dengan nama kunci.',
  aliases: ['addimg'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, sReply, arg, quotedMsg }) => {
    const name = arg.trim().toLowerCase();
    if (!name || /chat\.whatsapp\.com|instagram\.com|youtube\.com|youtu\.be|tiktok\.com/i.test(name)) return await sReply(`Nama gambar tidak valid.\n\nGunakan nama unik untuk gambar.\nContoh: .addimage fnbots`);
    const targetMsg = quotedMsg ? m.quoted || m : m.message;
    const mime = targetMsg?.imageMessage?.mimetype;
    const image = await Media.findOne({ name: name, type: 'image' });
    if (image) return await sReply(`Gagal! Nama gambar '${name}' sudah digunakan.`);
    const buffer = await fn.getMediaBuffer(targetMsg);
    await Media.create({
      name: name,
      type: 'image',
      mime: mime,
      data: buffer
    });
    await sReply(`✅ Gambar '${name}' berhasil disimpan.`);
  },
};