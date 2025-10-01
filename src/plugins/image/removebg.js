// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import util from 'util';
import sharp from 'sharp';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import path, { dirname } from 'path';
import { exec as cp_exec } from 'child_process';
import { tmpDir } from '../../lib/tempManager.js';

const exec = util.promisify(cp_exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const command = {
  name: 'removebg',
  category: 'image',
  description: 'Menghapus latar belakang gambar.',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, toId, dbSettings, quotedMsg, arg, sReply }) => {
    let command = '';
    const targetMsg = quotedMsg ? m.quoted || m : m.message;
    if (!targetMsg) return await sReply("Media tidak ditemukan.");
    const mime = targetMsg?.imageMessage?.mimetype;
    if (!mime || !mime.startsWith('image/')) return await sReply("Kirim atau balas sebuah GAMBAR.");
    const buffer = await fn.getMediaBuffer(targetMsg);
    if (!buffer) return await sReply("Gagal mengunduh media.");
    const inputPath = tmpDir.createTempFile('jpg', 'input-');
    const outputPath = tmpDir.createTempFile('jpg', 'output-');
    const sendPath = tmpDir.createTempFile('jpg', 'rembg-');
    const projectRoot = path.resolve(__dirname, '../../../');
    const scriptPath = path.join(projectRoot, 'src', 'utils', 'rembege.py');
    const venvPythonPath = path.join(projectRoot, 'venv', 'bin', 'python3');
    try {
      await fs.writeFile(inputPath, buffer);
      if (arg) {
        command = `"${venvPythonPath}" "${scriptPath}" "${inputPath}" "${outputPath}" "${arg.toUpperCase()}"`;
      } else {
        command = `"${venvPythonPath}" "${scriptPath}" "${inputPath}" "${outputPath}"`;
      }
      await exec(command);
      await sharp(outputPath).jpeg({ quality: 90, progressive: true, mozjpeg: true }).toFile(sendPath);
      await fn.sendFilePath(toId, dbSettings.autocommand, sendPath, { quoted: m });
    } finally {
      await tmpDir.deleteFile(inputPath); await tmpDir.deleteFile(outputPath); await tmpDir.deleteFile(sendPath);
    }
  }
};