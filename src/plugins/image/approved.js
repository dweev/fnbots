// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import fs from 'fs-extra';
import { saveFile, approved } from '../../function/index.js';

export const command = {
  name: 'approved',
  category: 'image',
  description: 'Add approved effect to an image',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId, dbSettings, quotedMsg, mentionedJidList, sReply }) => {
    let bufferMedia;
    let caption = dbSettings.autocommand;
    if (m.message?.imageMessage) {
      bufferMedia = await fn.getMediaBuffer(m.message)
    } else if (quotedMsg?.imageMessage) {
      bufferMedia = await fn.getMediaBuffer(quotedMsg)
    } else if (mentionedJidList && mentionedJidList.length > 0) {
      let targetJid = mentionedJidList[0];
      let profilePicBuffer;
      try {
        profilePicBuffer = await fn.profilePictureUrl(targetJid, "image");
      } catch {
        profilePicBuffer = await fs.readFile('./src/image/default-dp.jpeg');
      }
      bufferMedia = profilePicBuffer;
    } else {
      return await sReply(`Mohon balas atau kirim gambar untuk di-approved.`);
    }
    if (!bufferMedia) return await sReply(`Gagal mendapatkan media.`);
    const resBuffer = await approved(bufferMedia);
    const tempFilePath = await saveFile(resBuffer, "approve-in", 'jpg');
    await fn.sendFilePath(toId, caption, tempFilePath, { quoted: m });
    await fs.unlink(tempFilePath);
  }
};