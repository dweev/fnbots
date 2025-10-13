// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import fs from 'fs-extra';
import { spawn } from 'child_process';
import config from '../../../config.js';
import { tmpDir } from '../../lib/tempManager.js';
import { makeCircleSticker } from '../../function/index.js';

const execFFmpeg = (args) => {
  return new Promise((resolve, reject) => {
    const ffmpegPath = config.paths.ffmpeg || 'ffmpeg';
    const process = spawn(ffmpegPath, args);
    let stderr = '';
    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`FFmpeg exited with code ${code}\n${stderr}`));
      }
    });
    process.on('error', (err) => {
      reject(new Error(`Failed to start FFmpeg: ${err.message}`));
    });
  });
};

export const command = {
  name: 'circle',
  category: 'convert',
  description: 'convert image to circle sticker',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, quotedMsg, sReply, sendRawWebpAsSticker, dbSettings }) => {
    const targetMsg = quotedMsg ? m.quoted || m : m.message;
    if (!targetMsg) return await sReply("Media tidak ditemukan.");
    const mime = targetMsg?.imageMessage?.mimetype || targetMsg?.videoMessage?.mimetype;
    if (!mime) return await sReply("Kirim atau balas gambar/video untuk dijadikan stiker.");
    const buffer = await fn.getMediaBuffer(targetMsg);
    const isVideo = mime === "video/mp4" || mime === "image/gif";
    const duration = targetMsg?.videoMessage?.seconds || 0;
    if (!buffer) return await sReply("Gagal mengunduh media.");
    if (isVideo && duration > 20) return await sReply("❎ Durasi video terlalu panjang. Maksimal 10 detik untuk stiker.");
    if (isVideo) {
      const inputPath = await tmpDir.createTempFileWithContent(buffer, 'mp4');
      const outputPath = tmpDir.createTempFile('webp');
      const args = [
        '-i', inputPath,
        '-filter_complex',
        "[0:v]scale=512:512:force_original_aspect_ratio=increase,crop=512:512,setsar=1,format=rgba[main];" +
        "color=black:s=512x512,format=gray[b];" +
        "[b]geq='if(lte(sqrt(pow(X-256,2)+pow(Y-256,2)),256),255,0)'[mask];" +
        "[main][mask]alphamerge[out]",
        '-map', '[out]',
        '-c:v', 'libwebp',
        '-lossless', '0',
        '-q:v', '70',
        '-loop', '0',
        '-an',
        '-t', '10',
        '-preset', 'default',
        '-y',
        outputPath
      ];
      await execFFmpeg(args);
      const buffs = await fs.readFile(outputPath);
      await sendRawWebpAsSticker(buffs, { packName: dbSettings.packName, authorName: dbSettings.packAuthor });
      await tmpDir.deleteFile(inputPath);
      await tmpDir.deleteFile(outputPath);
    } else {
      const buffs = await makeCircleSticker(buffer);
      await sendRawWebpAsSticker(buffs, { packName: dbSettings.packName, authorName: dbSettings.packAuthor });
    }
  }
};