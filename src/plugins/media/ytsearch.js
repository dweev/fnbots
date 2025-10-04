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
  name: 'ytsearch',
  category: 'media',
  description: 'mencari video di youtube berdasarkan query',
  isLimitCommand: true,
  aliases: ['yts'],
  execute: async ({ dbSettings, arg, sReply, yts }) => {
    const query = arg;
    if (!query) return await sReply(`Silakan berikan judul lagu atau kata kunci pencarian.\nContoh: ${dbSettings.rname}ytsearch Never Gonna Give You Up`);
    const videos = await youtubeDownloader.searchVideos(query, 5);
    let teks = '*Hasil Pencarian YouTube:*\n\n';
    for (let i = 0; i < videos.length; i++) {
      teks += `${i + 1}. 🔍 *${videos[i].title}*\n` +
        `👤 ${videos[i].author.name}\n` +
        `⏰ ${videos[i].timestamp}\n` +
        `🔗 ${videos[i].url}\n\n`;
      yts.push(videos[i].url);
    }
    await sReply(teks);
  }
};