// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import fs from 'fs-extra';
import { subtitle } from '../../function/index.js';

export const command = {
  name: 'subtitle',
  category: 'image',
  description: 'Add subtitle effect to an image',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId, dbSettings, arg, sReply, quotedMsg, mentionedJidList }) => {
    if (!arg) return await sReply(`Mohon berikan teks yang ingin dijadikan subtitle.`);
    let bufferMedia;
    if (m.message?.imageMessage) {
      bufferMedia = await fn.getMediaBuffer(m.message);
    } else if (quotedMsg?.imageMessage) {
      bufferMedia = await fn.getMediaBuffer(quotedMsg);
    } else if (mentionedJidList && mentionedJidList.length > 0) {
      const targetJid = mentionedJidList[0];
      try {
        bufferMedia = await fn.profileImageBuffer(targetJid, 'image');
      } catch {
        bufferMedia = await fs.readFile('./src/image/default-dp.jpeg');
      }
    } else {
      return await sReply(`Mohon balas atau kirim gambar untuk dijadikan subtitle.`);
    }
    if (!bufferMedia) return await sReply(`Gagal mendapatkan media.`);
    const resBuffer = await subtitle(bufferMedia, arg);
    await fn.sendMediaFromBuffer(toId, 'image/jpeg', resBuffer, dbSettings.autocommand, m);
  }
};
