// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import config from '../../../config.js';
import { delay } from '../../function/index.js';
import { SpotifyDownloader } from 'yt-spotify-dl';

const spotify = new SpotifyDownloader();

export const command = {
  name: 'spotifydl',
  category: 'media',
  description: 'Download audio dari Spotify',
  isLimitCommand: true,
  execute: async ({ fn, m, toId, dbSettings, quotedMsg, args, sReply }) => {
    let input;
    if ((quotedMsg && quotedMsg?.type === 'extendedTextMessage') || (quotedMsg && quotedMsg?.type === 'conversation')) {
      input = quotedMsg?.body.trim();
    } else if (args.length > 0) {
      input = args[0];
    } else {
      return await sReply(`Perintah ini memerlukan input. Balas pesan berisi link, atau ketik langsung.\nContoh: ${dbSettings.rname}spotifydl https://open.spotify.com/track/...`);
    }
    if (!/^https?:\/\/open\.spotify\.com\/track\/[a-zA-Z0-9]+/i.test(input)) return await sReply(`URL TIDAK VALID!\nContoh: ${dbSettings.rname}spotifydl https://open.spotify.com/track/...`);
    const result = await spotify.downloadTrackOrCollection(input, config.paths.tempDir);
    await delay(2000);
    if (Array.isArray(result)) {
      for (const filePath of result) {
        await fn.sendFilePath(toId, dbSettings.autocommand, filePath, { quoted: m });
      }
    } else {
      await fn.sendFilePath(toId, dbSettings.autocommand, result, { quoted: m });
    }
  }
};
