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
import { delay } from 'baileys';
import config from '../../../config.js';
import { execFile as cp_execFile } from 'child_process';

const execFile = util.promisify(cp_execFile);
export const command = {
  name: 'stele',
  category: 'convert',
  description: 'convert telegram sticker to whatsapp webp sticker',
  isCommandWithoutPayment: true,
  aliases: ['stickertele'],
  execute: async ({ arg, sReply, dbSettings, sendRawWebpAsSticker }) => {
    await fs.ensureDir(config.paths.stickerDir, { mode: 0o755 });
    const inputDir = `${config.paths.stickerDir}/input`;
    const tmpDir = `${config.paths.stickerDir}/tmp`;
    if (!arg) return await sReply('Masukkan URL sticker TELEGRAM setelah perintah.');
    const telegramUrl = arg;
    await fs.ensureDir(inputDir);
    await fs.ensureDir(tmpDir);
    // prettier-ignore
    await execFile(
      config.paths.stickerConvertPath,
      [
        '--download-telegram', telegramUrl,
        '--telegram-token', process.env.TELE_TOKEN,
        '--telegram-userid', process.env.TELE_USERID,
        '--no-confirm',
        '--no-progress',
        '--no-compress',
        '--input-dir', inputDir,
      ]
    );
    await delay(2000);
    const files = await fs.readdir(inputDir);
    const webpFiles = files.filter((f) => f.endsWith('.webp'));
    if (!webpFiles.length) return await sReply('Tidak ada file stiker ditemukan.');
    for (const file of webpFiles) {
      const inputPath = path.join(inputDir, file);
      await fs.access(inputPath);
      await sendRawWebpAsSticker(inputPath, { packName: dbSettings.packName, authorName: dbSettings.packAuthor });
    }
    await fs.rm(config.paths.stickerDir, { recursive: true, force: true });
  }
};
