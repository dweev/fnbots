// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import fs from 'fs-extra';
import { loadImage } from 'canvas';
import { generateQuote } from 'generator-fake';
import { tmpDir } from '../../lib/tempManager.js';

export const command = {
  name: 'fakequotes',
  category: 'convert',
  description: 'Membuat Fake Quotes',
  isCommandWithoutPayment: true,
  execute: async ({ fn, toId, arg, sReply, dbSettings, m, quotedMsg, mentionedJidList }) => {
    if (!arg) return await sReply(`Mohon berikan teks yang ingin dibuatkan quotes..`);
    let bufferMedia;
    if (m.message?.imageMessage) {
      bufferMedia = await fn.getMediaBuffer(m.message);
    } else if (quotedMsg?.imageMessage) {
      bufferMedia = await fn.getMediaBuffer(quotedMsg);
    } else if (mentionedJidList && mentionedJidList.length > 0) {
      const targetJid = mentionedJidList[0];
      try {
        bufferMedia = await fn.profilePictureUrl(targetJid, 'image');
      } catch {
        bufferMedia = await fs.readFile('./src/image/default-dp.jpeg');
      }
    } else {
      return await sReply(`Mohon balas atau kirim gambar untuk dibuatkan quotes..`);
    }
    if (!bufferMedia) return await sReply(`Gagal mendapatkan media.`);
    const img = await loadImage(bufferMedia);
    const width = img.width;
    const height = img.height;
    const base = Math.min(width, height);
    const fontSize = Math.max(20, Math.floor(base * 0.06));
    const maxWidth = Math.floor(width * 0.5);
    const resBuffer = await generateQuote(bufferMedia, arg, {
      fontSize,
      maxWidth,
    });
    const tmpImagePath = await tmpDir.createTempFileWithContent(resBuffer, 'jpg');
    await fn.sendFilePath(toId, dbSettings.autocommand, tmpImagePath, { quoted: m });
    await tmpDir.deleteFile(tmpImagePath);
  }
};