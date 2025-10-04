// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import fs from 'fs-extra';
import { saveFile, blur } from '../../function/index.js';

export const command = {
  name: 'blur',
  category: 'image',
  description: 'Add blur effect to an image',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId, dbSettings, quotedMsg, mentionedJidList, sReply, arg, args }) => {
    const kontol = !arg ? 5 : (() => {
      const num = parseInt(args[0], 10);
      if (isNaN(num)) return sReply('Argumen pertama harus angka.');
      if (num > 10) return sReply('Angka tidak boleh lebih dari 10.');
      return num;
    })();
    let bufferMedia;
    const caption = dbSettings.autocommand;
    if (m.message?.imageMessage) {
      bufferMedia = await fn.getMediaBuffer(m.message);
    } else if (quotedMsg?.imageMessage) {
      bufferMedia = await fn.getMediaBuffer(quotedMsg);
    } else if (mentionedJidList && mentionedJidList.length > 0) {
      const targetJid = mentionedJidList[0];
      let profilePicBuffer;
      try {
        profilePicBuffer = await fn.profilePictureUrl(targetJid, "image");
      } catch {
        profilePicBuffer = await fs.readFile('./src/image/default-dp.jpeg');
      }
      bufferMedia = profilePicBuffer;
    } else {
      return await sReply(`Mohon balas atau kirim gambar untuk di-blur.`);
    }
    if (!bufferMedia) return await sReply(`Gagal mendapatkan media.`);
    const resBuffer = await blur(bufferMedia, kontol);
    const tempFilePath = await saveFile(resBuffer, "blur-in", 'jpg');
    await fn.sendFilePath(toId, caption, tempFilePath, { quoted: m });
    await fs.unlink(tempFilePath);
  }
};