// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { fetchTikTokData, buildBaseCaption, sendImages, normalizeResult } from '../../function/index.js';

export const command = {
  name: 'tiktok',
  category: 'media',
  description: 'Download media dari Tiktok',
  isLimitCommand: true,
  aliases: ['tt', 'tikdl'],
  execute: async ({ fn, m, toId, dbSettings, quotedMsg, args, sReply, reactDone }) => {
    let url;
    if ((quotedMsg && quotedMsg?.type === "extendedTextMessage") || (quotedMsg && quotedMsg?.type === "conversation")) {
      url = quotedMsg?.body.trim();
    } else if (args.length > 0) {
      url = args[0];
    } else {
      return await sReply(`Silakan balas pesan berisi link TikTok atau kirim linknya langsung.\nContoh: ${dbSettings.rname}tt https://...`);
    }
    const versions = ['v1', 'v2', 'v3'];
    let result = null;
    let lastError = null;
    for (const version of versions) {
      try {
        result = await Promise.race([
          fetchTikTokData(url, version),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout (${version})`)), 15000)
          )
        ]);
        if (result) break;
      } catch (error) {
        lastError = error;
        continue;
      }
    }
    if (!result) {
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
    const baseCaption = buildBaseCaption(normalizedResult);
    if (normalizedResult.type === 'video' && normalizedResult.videoUrl) {
      await fn.sendFromTiktok(toId, normalizedResult.videoUrl, baseCaption, m);
    } else if (normalizedResult.type === 'image' && normalizedResult.images?.length > 0) {
      await sendImages(fn, normalizedResult, args, toId, m, baseCaption);
    } else {
      return await sReply('Tidak dapat menemukan media yang valid dari TikTok.');
    }
    await reactDone();
  }
};