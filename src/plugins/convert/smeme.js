// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import sharp from 'sharp';
import fs from 'fs-extra';
import config from '../../../config.js';
import { generateMeme } from 'generator-fake';
import { tmpDir } from '../../lib/tempManager.js';
import { cleanFormattingText } from '../../function/index.js';

export const command = {
  name: 'smeme',
  category: 'convert',
  description: 'convert image to sticker memes',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, arg, quotedMsg, sendRawWebpAsSticker, mentionedJidList, sReply, dbSettings }) => {
    if (!arg) return await sReply(`Mohon berikan teks yang ingin dijadikan sticker meme.`);
    arg = cleanFormattingText(arg);
    let textTop = '';
    let textBot = '';
    let square = true;
    if (mentionedJidList && mentionedJidList.length > 0) {
      arg = arg.replace(`@${mentionedJidList[0].split('@')[0]}`, '').trim();
    }
    if (arg.includes('--full')) {
      square = false;
      arg = arg.replace('--full', '').trim();
    }
    if (arg.includes('|')) {
      const parts = arg.split('|').map((x) => cleanFormattingText(x.trim()));
      textBot = parts[0] || '';
      textTop = parts[1] || '';
    } else {
      textTop = '';
      textBot = arg.trim();
    }
    let bufferMedia;
    if (m.message?.imageMessage) {
      bufferMedia = await fn.getMediaBuffer(m.message);
    } else if (quotedMsg?.imageMessage) {
      bufferMedia = await fn.getMediaBuffer(quotedMsg);
    } else if (quotedMsg?.stickerMessage) {
      const mediaData = await fn.getMediaBuffer(quotedMsg);
      let isAnimated = false;
      try {
        const metadata = await sharp(mediaData).metadata();
        if ((metadata.pages && metadata.pages > 1) || (metadata.frames && metadata.frames > 1)) {
          isAnimated = true;
        }
      } catch {
        const animChunkIndex = mediaData.indexOf('ANIM', 12);
        if (animChunkIndex !== -1) {
          isAnimated = true;
        }
      }
      if (!isAnimated) {
        bufferMedia = mediaData;
      }
    } else if (mentionedJidList && mentionedJidList.length > 0) {
      const targetJid = mentionedJidList[0];
      try {
        bufferMedia = await fn.profileImageBuffer(targetJid, 'image');
      } catch {
        bufferMedia = await fs.readFile(config.paths.avatar);
      }
    } else {
      return await sReply(`Mohon balas atau kirim gambar untuk dijadikan sticker meme.`);
    }
    if (!bufferMedia) return await sReply(`Gagal mendapatkan media.`);
    const tmpInPath = await tmpDir.createTempFileWithContent(bufferMedia, 'jpg');
    const resBuffer = await generateMeme(tmpInPath, textTop, textBot, {
      topPadding: 60,
      bottomPadding: 30,
      fontSize: 45,
      square
    });
    await sendRawWebpAsSticker(resBuffer, { packName: dbSettings.packName, authorName: dbSettings.packAuthor });
    await tmpDir.deleteFile(tmpInPath);
  }
};
