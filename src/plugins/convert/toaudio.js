// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import util from 'util';
import { exec as cp_exec } from 'child_process';
import { tmpDir } from '../../lib/tempManager.js';

const exec = util.promisify(cp_exec);
export const command = {
  name: 'toaudio',
  category: 'convert',
  description: 'Mengconvert Video ke audio',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, quotedMsg, toId, sReply }) => {
    const targetMsg = quotedMsg ? m.quoted || m : m.message;
    const mime = targetMsg?.videoMessage?.mimetype || targetMsg?.documentMessage?.mimetype;
    if (!mime || !mime.includes('video')) return await sReply("Silakan balas video atau kirim video dengan caption `.toaudio`.");
    const buffer = await fn.getMediaBuffer(targetMsg);
    if (!buffer) return await sReply("Gagal mendapatkan data media dari pesan.");
    const videoExtension = mime.split('/')[1] || 'mp4';
    const inputPath = await tmpDir.createTempFileWithContent(buffer, videoExtension);
    const outputPath = tmpDir.createTempFile('mp3');
    const probeCommand = `ffprobe -v error -select_streams a:0 -show_entries stream=codec_type -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`;
    const { stdout } = await exec(probeCommand);
    if (!stdout.trim() || stdout.trim() !== 'audio') {
      await tmpDir.deleteFile(inputPath);
      return await sReply("Video ini tidak memiliki audio. Tidak bisa dikonversi ke MP3.");
    }
    const ffmpegCommand = `ffmpeg -i "${inputPath}" -vn -c:a libmp3lame -q:a 2 "${outputPath}"`;
    await exec(ffmpegCommand);
    await fn.sendFilePath(toId, global.filename, outputPath, { quoted: m });
    await tmpDir.deleteFile(inputPath); await tmpDir.deleteFile(outputPath);
  }
};