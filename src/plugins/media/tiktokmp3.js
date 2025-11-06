// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { fetchTikTokData, normalizeResult } from '../../function/index.js';

export const command = {
  name: 'tiktokmp3',
  category: 'media',
  description: 'Download audio dari Tiktok',
  isLimitCommand: true,
  aliases: ['ttmp3', 'tikdlmp3'],
  execute: async ({ fn, m, toId, dbSettings, quotedMsg, args, sReply, reactDone }) => {
    let url;
    if ((quotedMsg && quotedMsg?.type === 'extendedTextMessage') || (quotedMsg && quotedMsg?.type === 'conversation')) {
      url = quotedMsg?.body.trim();
    } else if (args.length > 0) {
      url = args[0];
    } else {
      return await sReply(`Silakan balas pesan berisi link TikTok atau kirim linknya langsung.\nContoh: ${dbSettings.rname}ttmp3 https://...`);
    }
    const versions = ['v1', 'v2', 'v3'];
    let result = null;
    let lastError = null;
    for (const version of versions) {
      try {
        result = await Promise.race([fetchTikTokData(url, version), new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout (${version})`)), 15000))]);
        if (result) break;
      } catch (error) {
        lastError = error;
        continue;
      }
    }
    if (!result) {
      // prettier-ignore
      return await sReply(
        `Gagal mengunduh TikTok.\n\n` +
        `Error terakhir: ${lastError?.message || 'Unknown error'}\n\n` +
        `Kemungkinan penyebab:\n` +
        `• Link tidak valid\n` +
        `• Video bersifat pribadi\n` +
        `• API downloader bermasalah\n` +
        `• Koneksi timeout`
      );
    }
    const normalizedResult = normalizeResult(result);
    if (!normalizedResult.music?.playUrl || normalizedResult.music.playUrl.length === 0) {
      return await sReply('Tidak dapat menemukan audio dari TikTok ini.');
    }
    const musicUrl = Array.isArray(normalizedResult.music.playUrl) ? normalizedResult.music.playUrl[0] : normalizedResult.music.playUrl;
    try {
      await fn.sendFromTiktok(toId, musicUrl, null, m, 'audio');
      await reactDone();
    } catch (error) {
      return await sReply(`Gagal mengirim audio: ${error.message}`);
    }
  }
};
