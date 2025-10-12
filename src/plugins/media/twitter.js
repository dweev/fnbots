// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import util from 'util';
import log from '../../lib/logger.js';
import config from '../../../config.js';
import { exec as cp_exec } from 'child_process';
import { mergeVideoAudio } from '../../addon/bridge.js';

const exec = util.promisify(cp_exec);

export const command = {
  name: 'twitter',
  category: 'media',
  description: 'Download media dari Twitter',
  isLimitCommand: true,
  aliases: ['twt', 'twitdl'],
  execute: async ({ fn, m, toId, dbSettings, quotedMsg, args, sReply }) => {
    try {
      let input;
      if ((quotedMsg && quotedMsg?.type === "extendedTextMessage") || (quotedMsg && quotedMsg?.type === "conversation")) {
        input = quotedMsg?.body;
      } else if (args.length > 0) {
        input = args[0];
      } else {
        return await sReply("Silakan berikan URL Twitter/X atau balas pesan yang berisi URL.");
      }
      if (!/^https?:\/\/(www\.)?(mobile\.)?(twitter\.com|x\.com)/.test(input)) return await sReply("URL yang Kamu berikan bukan URL Twitter/X yang valid.");
      const downloadVideoCmd = `${config.paths.ytDlpPath} -f "bestvideo[ext=mp4]" -o - "${input}"`;
      const { stdout: videoBuffer } = await exec(downloadVideoCmd, {
        shell: '/bin/bash',
        encoding: 'buffer',
        maxBuffer: 200 * 1024 * 1024
      });
      const downloadAudioCmd = `${config.paths.ytDlpPath} -f "bestaudio[ext=m4a]" -o - "${input}"`;
      const { stdout: audioBuffer } = await exec(downloadAudioCmd, {
        shell: '/bin/bash',
        encoding: 'buffer',
        maxBuffer: 200 * 1024 * 1024
      });
      const finalBuffer = mergeVideoAudio(videoBuffer, audioBuffer, {
        preset: 'ultrafast',
        crf: 26
      });
      await fn.sendMediaFromBuffer(toId, 'video/mp4', finalBuffer, dbSettings.autocommand, m);
    } catch (error) {
      if (error.stderr) {
        await log(`YTDLP Error:\n\n${error.stderr}`, true);
        await sReply("Gagal memproses video. Pastikan URL valid, video bersifat publik, dan tidak dibatasi.");
      } else {
        await log(`Error: ${error.message}`, true);
        await sReply(error.message);
      }
    }
  }
};