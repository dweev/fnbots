// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { tmpDir } from '../../lib/tempManager.js';
import { saveFile } from '../../function/index.js';

export const command = {
  name: 'updatepictureprofile',
  displayName: 'update-pictureprofile',
  category: 'bot',
  description: 'Mengubah foto profil bot.',
  isCommandWithoutPayment: true,
  aliases: ['updatepp', 'updateprofilepic', 'setpp', 'setprofilepic', 'update-pictureprofile'],
  execute: async ({ fn, m, quotedMsg, sReply, reactDone, botNumber }) => {
    const targetMsg = quotedMsg ? m.quoted || m : m.message;
    const mimeType = targetMsg?.imageMessage?.mimetype;
    if (!mimeType || !mimeType.startsWith('image/')) return await sReply(`Silakan balas pesan gambar atau kirim gambar untuk mengubah foto profil bot.`);
    const resBuffer = await fn.getMediaBuffer(targetMsg);
    if (!resBuffer) return await sReply(`Gagal mendapatkan gambar dari pesan yang dibalas.`);
    const filename = await saveFile(resBuffer, "tmp_group_icon");
    await fn.updateProfilePicture(botNumber, { url: filename });
    await tmpDir.deleteFile(filename); await reactDone();
  }
};