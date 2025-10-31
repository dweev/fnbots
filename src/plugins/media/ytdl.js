// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow  https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { YoutubeDownloader } from 'yt-spotify-dl';
import { cleanYoutubeUrl } from '../../function/index.js';

const youtubeDownloader = new YoutubeDownloader();

export const command = {
  name: 'ytdl',
  category: 'media',
  description: 'Download audio dari youtube berdasarkan query',
  isLimitCommand: true,
  aliases: ['ytmp3'],
  execute: async ({ fn, m, toId, dbSettings, arg, sReply, yts, quotedMsg, args }) => {
    let input;
    if ((quotedMsg && quotedMsg?.type === 'extendedTextMessage') || (quotedMsg && quotedMsg?.type === 'conversation')) {
      input = quotedMsg?.body.trim();
    } else if (arg.length > 0) {
      input = args[0];
    } else {
      return await sReply(`Perintah ini memerlukan input. Balas pesan berisi link/indeks, atau ketik langsung.\nContoh: ${dbSettings.rname}ytdl https://... atau ${dbSettings.rname}ytdl 1 (setelah ${dbSettings.rname}ytsearch)`);
    }
    let url = '';
    let videoTitle;
    if (/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(input)) {
      url = cleanYoutubeUrl(input);
      const metadata = await youtubeDownloader.getVideoMetadata(url);
      videoTitle = metadata.filename.replace(/_/g, ' ');
    } else {
      if (!yts || yts.length === 0) {
        return await sReply(`Tidak ada hasil pencarian sebelumnya. Silakan lakukan pencarian (misal: dengan ${dbSettings.rname}ytsearch) sebelum menggunakan indeks.`);
      }
      const cleanYts = yts
        .map((item) => {
          if (typeof item === 'string') {
            return item.trim();
          } else if (item && typeof item.url === 'string') {
            return item.url.trim();
          }
          return null;
        })
        .filter((url) => url && /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(url));
      const index = parseInt(input) - 1;
      if (isNaN(index) || index < 0 || index >= cleanYts.length) {
        return await sReply(`Indeks tidak valid. Pilih nomor antara 1 dan ${cleanYts.length}.`);
      }
      const videoUrl = cleanYts[index];
      url = cleanYoutubeUrl(videoUrl);
      videoTitle = `Audio dari YouTube - ${index + 1}`;
    }
    const downloadedFilePath = await youtubeDownloader.download(url, null, global.tmpDir, null, '0');
    await fn.sendFilePath(toId, videoTitle, downloadedFilePath, { quoted: m });
  }
};
