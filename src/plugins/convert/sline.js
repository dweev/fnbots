// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import path from 'path';
import util from 'util';
import fs from 'fs-extra';
import config from '../../../config.js';
import { delay } from '../../function/index.js';
import { exec as cp_exec } from 'child_process';

const exec = util.promisify(cp_exec);
export const command = {
  name: 'sline',
  category: 'convert',
  description: 'convert line sticker to whatsapp webp sticker',
  isCommandWithoutPayment: true,
  aliases: ['stickerline'],
  execute: async ({ arg, sReply, dbSettings, sendRawWebpAsSticker }) => {
    await fs.ensureDir(config.paths.stickerDir, { mode: 0o755 });
    const inputDir = `${config.paths.stickerDir}/input`;
    const outputDir = `${config.paths.stickerDir}/output`;
    const tmpDir = `${config.paths.stickerDir}/tmp`;
    if (!arg) return await sReply('Masukkan URL sticker LINE setelah perintah.');
    const lineUrl = arg;
    await fs.ensureDir(inputDir);
    await fs.ensureDir(outputDir);
    await fs.ensureDir(tmpDir);
    await exec(`"${config.paths.stickerConvertPath}" --download-line "${lineUrl}" --no-confirm --no-progress --no-compress --input-dir "${inputDir}"`);
    await delay(2000);
    const files = await fs.readdir(inputDir);
    const pngFiles = files.filter((f) => f.endsWith('.png'));
    if (!pngFiles.length) return await sReply('Tidak ada file stiker ditemukan.');
    for (const file of pngFiles) {
      const inputPath = path.join(inputDir, file);
      const outputPath = path.join(outputDir, file.replace('.png', '.webp'));
      await exec(`rm -rf ${tmpDir}/*`);
      await exec(`ffmpeg -i "${inputPath}" "${tmpDir}/frame_%04d.png"`);
      await exec(`ffmpeg -framerate 15 -i "${tmpDir}/frame_%04d.png" -plays 0 -lossless 1 "${outputPath}"`);
      await fs.access(outputPath);
      await sendRawWebpAsSticker(outputPath, { packName: dbSettings.packName, authorName: dbSettings.packAuthor });
    }
    await fs.rm(config.paths.stickerDir, { recursive: true, force: true });
  }
};
