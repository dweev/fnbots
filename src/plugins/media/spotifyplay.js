// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { delay } from 'baileys';
import config from '../../../config.js';
import { tmpDir } from '../../lib/tempManager.js';
import { SpotifyDownloader } from 'yt-spotify-dl';

const spotify = new SpotifyDownloader();

export const command = {
  name: 'spotifyplay',
  category: 'media',
  description: 'Download audio dari Spotify',
  isLimitCommand: true,
  execute: async ({ fn, m, toId, dbSettings, sReply, arg }) => {
    const query = arg;
    if (!query) return await sReply(`Silakan berikan judul lagu atau kata kunci pencarian.\n\n*Contoh:* ${dbSettings.rname}spotifyplay Boombastic`);
    const searchResults = await spotify.search(query);
    if (searchResults.length === 0) return await sReply(`Lagu dengan kata kunci "${query}" tidak ditemukan.`);
    const result = await spotify.downloadTrackOrCollection(searchResults[0].link, config.paths.tempDir);
    await delay(2000);
    if (Array.isArray(result)) {
      for (const filePath of result) {
        await fn.sendFilePath(toId, dbSettings.autocommand, filePath, { quoted: m });
        await tmpDir.deleteFile(filePath);
      }
    } else {
      await fn.sendFilePath(toId, dbSettings.autocommand, result, { quoted: m });
      await tmpDir.deleteFile(result);
    }
  }
};