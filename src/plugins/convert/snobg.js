// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import util from 'util';
import fs from 'fs-extra';
import config from '../../../config.js';
import { exec as cp_exec } from 'child_process';
import { tmpDir } from '../../lib/tempManager.js';

const exec = util.promisify(cp_exec);

export const command = {
  name: 'snobg',
  category: 'convert',
  description: 'convert image to no background sticker',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, arg, quotedMsg, sReply, sendRawWebpAsSticker, dbSettings }) => {
    let command = '';
    const targetMsg = quotedMsg ? m.quoted || m : m.message;
    if (!targetMsg) return await sReply("Media tidak ditemukan.");
    const mime = targetMsg?.imageMessage?.mimetype;
    if (!mime || !mime.startsWith('image/')) return await sReply("Kirim atau balas sebuah GAMBAR untuk dijadikan stiker.");
    const buffer = await fn.getMediaBuffer(targetMsg);
    if (!buffer) return await sReply("Gagal mengunduh media.");
    const inputPath = tmpDir.createTempFile('jpg');
    const outputPath = tmpDir.createTempFile('jpg');
    await fs.writeFile(inputPath, buffer);
    if (arg) {
      command = `"${config.paths.pythonPath}" "${config.paths.rembege}" "${inputPath}" "${outputPath}" "${arg.toUpperCase()}"`;
    } else {
      command = `"${config.paths.pythonPath}" "${config.paths.rembege}" "${inputPath}" "${outputPath}"`;
    }
    await exec(command);
    const finalStickerBuffer = await fs.readFile(outputPath);
    await sendRawWebpAsSticker(finalStickerBuffer, { packName: dbSettings.packName, authorName: dbSettings.packAuthor });
    await tmpDir.deleteFile(inputPath);
    await tmpDir.deleteFile(outputPath);
  }
};