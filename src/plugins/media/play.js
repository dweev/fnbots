// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { YoutubeDownloader } from 'yt-spotify-dl';
const youtubeDownloader = new YoutubeDownloader();

export const command = {
  name: 'play',
  category: 'media',
  description: 'Mendownload musik dari youtube dengan kualitas terbaik',
  isLimitCommand: true,
  aliases: ['musicdl'],
  execute: async ({ fn, m, toId, dbSettings, arg, sReply }) => {
    const query = arg;
    if (!query) return await sReply(`Silakan berikan judul lagu atau link YouTube.\nContoh: ${dbSettings.rname}play Never Gonna Give You Up`);
    const search = await youtubeDownloader.searchVideos(query, 1);
    const video = search[0];
    if (!video) return await sReply(`Lagu dengan judul "${query}" tidak ditemukan.`);
    const videoTitle = video.title;
    const videoUrl = video.url;
    const downloadedFilePath = await youtubeDownloader.download(videoUrl, null, global.tmpDir, null, '0');
    const caption = `*Title:* ${videoTitle}\n*URL:* ${videoUrl}`;
    await fn.sendFilePath(toId, caption, downloadedFilePath, { quoted: m });
  }
};