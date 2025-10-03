// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { SpotifyDownloader } from 'yt-spotify-dl';

const spotify = new SpotifyDownloader();

export const command = {
  name: 'spotifysearch',
  category: 'media',
  description: 'Mencari audio dari Spotify',
  isLimitCommand: true,
  execute: async ({ dbSettings, arg, sReply }) => {
    const query = arg;
    if (!query) return await sReply(`Silakan berikan judul lagu atau kata kunci pencarian.\n\n*Contoh:* ${dbSettings.rname}spotifysearch Boombastic`);
    const searchResults = await spotify.search(query);
    if (searchResults.length === 0) return await sReply(`Lagu dengan kata kunci "${query}" tidak ditemukan.`);
    const tracks = searchResults.slice(0, 5);
    let teks = '✨ *Hasil Pencarian Spotify:*\n\n';
    for (let i = 0; i < tracks.length; i++) {
      const track = tracks[i];
      const totalSeconds = Math.floor(track.duration_ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = (totalSeconds % 60).toString().padStart(2, '0');
      const duration = `${minutes}:${seconds}`;
      teks += `*${i + 1}.* 🎵 *${track.name}*\n` +
        `   👤 *Artis:* ${track.artists}\n` +
        `   ⏰ *Durasi:* ${duration}\n` +
        `   🔗 *Link:* ${track.link}\n\n`;
    }
    await sReply(teks);
  }
};