// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import util from 'util';
import sharp from 'sharp';
import { exec as cp_exec } from 'child_process';
import { tmpDir } from '../../lib/tempManager.js';
import { bratGenerator } from 'qc-generator-whatsapp';

const exec = util.promisify(cp_exec);
export const command = {
  name: 'toimg',
  category: 'convert',
  description: 'Mengconvert text ke gambar',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, args, quotedMsg, toId, sReply, dbSettings }) => {
    if (quotedMsg && quotedMsg?.type === "stickerMessage") {
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
      if (isAnimated) {
        let inputGifPath;
        const outputMp4Path = tmpDir.createTempFile('mp4');
        try {
          const gifBuffer = await sharp(mediaData, { animated: true }).gif().toBuffer();
          inputGifPath = await tmpDir.createTempFileWithContent(gifBuffer, 'gif');
          const ffmpegCommand = `ffmpeg -i "${inputGifPath}" -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${outputMp4Path}"`;
          await exec(ffmpegCommand);
          await fn.sendFilePath(toId, dbSettings.autocommand, outputMp4Path, { quoted: m });
        } finally {
          await tmpDir.deleteFile(inputGifPath);
        }
      } else {
        await fn.sendMediaFromBuffer(toId, 'image/png', mediaData, dbSettings.autocommand, m);
      }
    } else {
      let inputText;
      if (quotedMsg && (quotedMsg?.type === "extendedTextMessage" || quotedMsg?.type === "conversation")) {
        inputText = quotedMsg?.body;
      } else if (args.length > 0) {
        inputText = args.join(' ');
      } else {
        return await sReply("Berikan teks atau balas stiker/teks yang ingin diubah menjadi gambar.");
      }
      if (inputText.length > 200) return await sReply("Teks terlalu panjang! Maksimal 200 karakter.");
      const buffer = await bratGenerator(inputText);
      const resultBuffer = Buffer.from(buffer, 'base64');
      await fn.sendMediaFromBuffer(toId, 'image/jpeg', resultBuffer, dbSettings.autocommand, m);
    }
  }
};