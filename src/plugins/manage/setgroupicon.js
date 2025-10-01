// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { generateProfilePicture } from 'baileys';
import { tmpDir } from '../../lib/tempManager.js';
import { saveFile } from '../../function/index.js';

export const command = {
  name: 'setgroupicon',
  category: 'manage',
  description: 'Mengatur foto profile group',
  isCommandWithoutPayment: true,
  execute: async ({ fn, toId, sReply, isBotGroupAdmins, args, arg, m, quotedMsg, reactDone }) => {
    if (!arg) {
      if (!m.isGroup || !isBotGroupAdmins) return await sReply(`Perintah ini hanya bisa digunakan di grup dan bot harus menjadi admin grup.`);
      const targetMsg = quotedMsg ? m.quoted || m : m.message;
      const mimeType = targetMsg?.imageMessage?.mimetype;
      if (!mimeType || !mimeType.startsWith('image/')) return await sReply(`Balas pesan gambar atau kirim gambar dengan perintah ini.`);
      const resBuffer = await fn.getMediaBuffer(targetMsg);
      if (!resBuffer) return await sReply(`Gagal mendapatkan gambar dari pesan yang dibalas.`);
      const filename = await saveFile(resBuffer, "tmp_group_icon");
      await fn.updateProfilePicture(toId, { url: filename });
      await tmpDir.deleteFile(filename); await reactDone();
    } else if (arg && args[0] === "full") {
      if (!m.isGroup || !isBotGroupAdmins) return await sReply(`Perintah ini hanya bisa digunakan di grup dan bot harus menjadi admin grup.`);
      const targetMsg = quotedMsg ? m.quoted || m : m.message;
      const mimeType = targetMsg?.imageMessage?.mimetype;
      if (!mimeType || !mimeType.startsWith('image/')) return await sReply(`Balas pesan gambar atau kirim gambar dengan perintah ini.`);
      const resBuffer = await fn.getMediaBuffer(targetMsg);
      if (!resBuffer) return await sReply(`Gagal mendapatkan gambar dari pesan yang dibalas.`);
      let { img } = await generateProfilePicture(resBuffer);
      await fn.query({
        tag: 'iq',
        attrs: {
          target: m.chat,
          to: '@s.whatsapp.net',
          type: 'set',
          xmlns: 'w:profile:picture'
        },
        content: [{ tag: 'picture', attrs: { type: 'image' }, content: img }]
      });
      await reactDone();
    }
  }
};