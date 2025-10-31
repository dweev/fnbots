// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow  https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import config from '../../../config.js';
import { YoutubeDownloader } from 'yt-spotify-dl';
import { cleanYoutubeUrl } from '../../function/index.js';

const youtubeDownloader = new YoutubeDownloader();

export const command = {
  name: 'ytvid',
  category: 'media',
  description: 'Download video dari youtube berdasarkan query',
  isLimitCommand: true,
  aliases: ['ytmp4'],
  execute: async ({ fn, m, toId, dbSettings, sReply, yts, quotedMsg, args }) => {
    let input;
    let resolution = null;
    let url = '';
    if (args.length > 0) {
      const firstArg = args[0];
      if (/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(firstArg)) {
        input = cleanYoutubeUrl(firstArg);
      } else {
        if (!yts || yts.length === 0) return await sReply(`Tidak ada hasil pencarian sebelumnya. Silakan lakukan pencarian (misal: dengan ${dbSettings.rname}ytsearch) sebelum menggunakan indeks.`);
        const index = parseInt(firstArg, 10) - 1;
        if (isNaN(index) || index < 0 || index >= yts.length) return await sReply('Indeks video tidak valid.');
        const videoItem = yts[index];
        if (typeof videoItem === 'string') {
          input = cleanYoutubeUrl(videoItem.trim());
        } else if (videoItem && typeof videoItem.url === 'string') {
          input = cleanYoutubeUrl(videoItem.url.trim());
        } else {
          return await sReply('Format data pencarian tidak valid.');
        }
      }
      if (args.length > 1) {
        resolution = args[1].toLowerCase();
      }
    } else if ((quotedMsg && quotedMsg?.type === 'extendedTextMessage') || (quotedMsg && quotedMsg?.type === 'conversation')) {
      input = quotedMsg?.body;
    } else {
      return await sReply('Silakan berikan URL YouTube atau pilih dari hasil pencarian.');
    }
    url = input;
    const downloadedFilePath = await youtubeDownloader.downloadVideo(url, {
      customDir: config.paths.tempDir,
      resolution: resolution
    });
    await fn.sendFilePath(toId, dbSettings.autocommand, downloadedFilePath, { quoted: m });
  }
};
