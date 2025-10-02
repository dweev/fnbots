// ─── Info ───────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── info src/function/function2.js ─────────────

import { createCanvas, loadImage } from 'canvas';
import { delay } from 'baileys';
import { Downloader } from '@tobyg74/tiktok-api-dl';

export function cleanYoutubeUrl(url) {
  return url.replace(/(&|\?)list=[^&]*/i, '$1').replace(/(&|\?)index=[^&]*/i, '$1').replace(/[&?]$/, '');
}
export function chunkArray(array, chunkSize) {
  const results = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    results.push(array.slice(i, i + chunkSize));
  }
  return results;
};
export function parseImageSelection(selectionString, maxImages) {
  const indices = new Set();
  const parts = selectionString.split(',');
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.trim().split('-').map(Number);
      if (!isNaN(start) && !isNaN(end) && start > 0 && end >= start && start <= maxImages) {
        for (let i = start; i <= Math.min(end, maxImages); i++) {
          indices.add(i - 1);
        }
      }
    } else {
      const index = Number(part.trim());
      if (!isNaN(index) && index > 0 && index <= maxImages) {
        indices.add(index - 1);
      }
    }
  }
  return Array.from(indices).sort((a, b) => a - b);
};
export function buildBaseCaption(result) {
  return `🎬 *TikTok Downloader*\n\n` +
    `👤 *Author:* @${result.author?.username || 'N/A'}\n` +
    `❤️ *Likes:* ${result.statistics?.diggCount || 0}\n` +
    `💬 *Comments:* ${result.statistics?.commentCount || 0}\n` +
    `🔗 *Shares:* ${result.statistics?.shareCount || 0}\n\n` +
    `📝 *Deskripsi:* ${result.desc || '(Tidak ada deskripsi)'}`;
};
export async function fetchTikTokData(url, version = 'v1') {
  if (!/^https?:\/\/(www\.|vt\.|vm\.|t\.)?tiktok\.com/.test(url)) {
    throw new Error("URL yang Kamu berikan sepertinya bukan link TikTok yang valid.");
  }
  const data = await Downloader(url, { version });
  if (data.status !== 'success' || !data.result) {
    throw new Error("Gagal memproses permintaan tiktok. API downloader mungkin bermasalah, link tidak valid, atau video bersifat pribadi.");
  }
  return data.result;
};
export async function sendImages(fn, result, args, toId, m, baseCaption) {
  const imageSelection = args[1];
  let mediaToSend;
  if (imageSelection) {
    const indicesToDownload = parseImageSelection(imageSelection, result.images.length);
    if (indicesToDownload.length === 0) {
      throw new Error(`Format pemilihan gambar salah!\nTotal: ${result.images.length}\nContoh: \`.tt [url] 1,3,5\` atau \`.tt [url] 2-5\``);
    }
    mediaToSend = indicesToDownload.map(index => ({
      image: { url: result.images[index] },
      caption: `${baseCaption}\n\n📌 *Gambar Pilihan ${index + 1} dari ${result.images.length}*`
    }));
  } else {
    mediaToSend = result.images.map((url, index) => ({
      image: { url },
      caption: `${baseCaption}\n\n🖼️ *Gambar ${index + 1} dari ${result.images.length}*`
    }));
  }
  if (mediaToSend.length <= 1) {
    await fn.sendFileUrl(toId, mediaToSend[0].image.url, mediaToSend[0].caption, m);
  } else {
    const chunks = chunkArray(mediaToSend, 15);
    for (const [index, chunk] of chunks.entries()) {
      await fn.sendAlbum(toId, chunk, { quoted: m });
      if (chunks.length > 1 && index < chunks.length - 1) {
        await delay(1000);
      }
    }
  }
};
export async function makeCircleSticker(buffer) {
  const img = await loadImage(buffer);
  const diameter = Math.min(img.width, img.height);
  const canvas = createCanvas(diameter, diameter);
  const ctx = canvas.getContext('2d');
  const sx = (img.width - diameter) / 2;
  const sy = (img.height - diameter) / 2;
  const radius = diameter / 2;
  ctx.beginPath();
  ctx.arc(radius, radius, radius, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, sx, sy, diameter, diameter, 0, 0, diameter, diameter);
  return canvas.toBuffer('image/png');
};