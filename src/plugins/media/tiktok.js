// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { fetchTikTokData, buildBaseCaption, sendImages } from '../../function/index.js';

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
    let result;
    try {
      result = await fetchTikTokData(url, 'v1');
    } catch {
      try {
        result = await fetchTikTokData(url, 'v2');
      } catch {
        result = await fetchTikTokData(url, 'v3');
      }
    }
    const baseCaption = buildBaseCaption(result);
    if (result.type === 'video' && result.video?.playAddr) {
      const videoUrl = (Array.isArray(result.video.playAddr) && result.video.playAddr.length > 0) ? result.video.playAddr[0] : result.video.playAddr;
      await fn.sendFromTiktok(toId, videoUrl, baseCaption, m);
    } else if (result.type === 'image' && result.images?.length > 0) {
      await sendImages(fn, result, args, toId, m, baseCaption);
    }
    await reactDone();
  }
};