// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { Media } from '../../../database/index.js';

export const command = {
  name: 'addvideo',
  category: 'vip',
  description: 'Menyimpan video ke database dengan nama kunci.',
  aliases: ['addvid'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, sReply, arg, quotedMsg }) => {
    const name = arg.trim().toLowerCase();
    if (!name || /chat\.whatsapp\.com|instagram\.com|youtube\.com|youtu\.be|tiktok\.com/i.test(name)) return await sReply(`Nama video tidak valid.\n\nGunakan nama unik untuk video.\nContoh: .addvideo fnbots`);
    const targetMsg = quotedMsg ? m.quoted || m : m.message;
    const mime = targetMsg?.videoMessage?.mimetype;
    const video = await Media.findOne({ name: name, type: 'video' });
    if (video) return await sReply(`Gagal! Nama video '${name}' sudah digunakan.`);
    const buffer = await fn.getMediaBuffer(targetMsg);
    await Media.create({
      name: name,
      type: 'video',
      mime: mime,
      data: buffer
    });
    await sReply(`✅ video '${name}' berhasil disimpan.`);
  },
};