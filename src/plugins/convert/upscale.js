// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import util from 'util';
import sizeOf from 'image-size';
import { exec as cp_exec } from 'child_process';
import { tmpDir } from '../../lib/tempManager.js';

const exec = util.promisify(cp_exec);
export const command = {
  name: 'upscale',
  category: 'convert',
  description: 'Upscale Media using ffmpeg',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId, quotedMsg, dbSettings, sReply }) => {
    const targetMsg = quotedMsg ? m.quoted || m : m.message;
    const mimeType = targetMsg?.imageMessage?.mimetype;
    if (!mimeType) return await sReply(`Kirim atau balas pesan gambar untuk diubah.`);
    const media = await fn.getMediaBuffer(targetMsg);
    if (!media) return await sReply('Gagal mengunduh media.');
    const dimensions = sizeOf(media);
    const { width, height } = dimensions;
    const inputPath = await tmpDir.createTempFileWithContent(media, 'jpg');
    const outputPath = tmpDir.createTempFile('jpg');
    const TARGET_RESOLUTION = 4096;
    if (width >= TARGET_RESOLUTION || height >= TARGET_RESOLUTION) return await sReply("Gambar ini sudah memiliki resolusi tinggi, tidak perlu di-HD.");
    const scaleX = TARGET_RESOLUTION / width;
    const scaleY = TARGET_RESOLUTION / height;
    const scaleFactor = Math.min(scaleX, scaleY, 9);
    const command = `ffmpeg -i "${inputPath}" -vf "scale=iw*${scaleFactor}:ih*${scaleFactor}:flags=lanczos" -q:v 1 "${outputPath}"`;
    await exec(command);
    await fn.sendFilePath(toId, dbSettings.autocommand, outputPath, { quoted: m });
    await tmpDir.deleteFile(inputPath);
    await tmpDir.deleteFile(outputPath);
  }
};