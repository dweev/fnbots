// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import fs from 'fs-extra';
import util from 'util';
import { exec as cp_exec } from 'child_process';
import { tmpDir } from '../../lib/tempManager.js';
import log from '../../lib/logger.js';
import config from '../../../config.js';

const exec = util.promisify(cp_exec);

export const command = {
  name: 'facebook',
  category: 'media',
  description: 'Download media dari Facebook',
  isLimitCommand: true,
  aliases: ['fb', 'fbdl'],
  execute: async ({ fn, m, toId, dbSettings, quotedMsg, args, sReply }) => {
    try {
      const tempVideoPath = tmpDir.createTempFile('mp4');
      const tempAudioPath = tmpDir.createTempFile('m4a');
      const finalOutputPath = tmpDir.createTempFile('mp4');
      let input;
      if ((quotedMsg && quotedMsg?.type === "extendedTextMessage") || (quotedMsg && quotedMsg?.type === "conversation")) {
        input = quotedMsg?.body;
      } else if (args.length > 0) {
        input = args[0];
      } else {
        return await sReply("Silakan berikan URL Facebook atau balas pesan yang berisi URL.");
      }
      if (!/^https?:\/\/(www\.)?(m\.)?(web\.)?facebook\.com([/?#]|$)/.test(input)) return await sReply("URL yang Kamu berikan bukan URL Facebook yang valid.");
      const downloadVideoCmd = `${config.paths.ytDlpPath} -f "bestvideo[ext=mp4]" -o "${tempVideoPath}" "${input}"`;
      const downloadAudioCmd = `${config.paths.ytDlpPath} -f "bestaudio[ext=m4a]" -o "${tempAudioPath}" "${input}"`;
      await exec(downloadVideoCmd, { shell: '/bin/bash' });
      await exec(downloadAudioCmd, { shell: '/bin/bash' });
      const ffmpegCmd = `ffmpeg -i "${tempVideoPath}" -i "${tempAudioPath}" -c:v libx264 -pix_fmt yuv420p -c:a aac -movflags +faststart "${finalOutputPath}"`;
      await exec(ffmpegCmd, { shell: '/bin/bash' });
      await fs.access(finalOutputPath);
      await fn.sendFilePath(toId, dbSettings.autocommand, finalOutputPath, { quoted: m });
      await tmpDir.deleteFile(tempVideoPath); await tmpDir.deleteFile(tempAudioPath); await tmpDir.deleteFile(finalOutputPath);
    } catch (error) {
      if (error.stderr) {
        await log(`FFMPEG/YTDLP Error:\n\n${error.stderr}`, true);
        await sReply("Gagal memproses video. Pastikan URL valid, video bersifat publik, dan tidak dibatasi.");
      } else {
        await sReply(error.message);
      }
    }
  }
};