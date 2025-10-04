// ─── Info ───────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── info src/function/function2.js ─────────────

import sharp from 'sharp';
import axios from 'axios';
import { delay } from 'baileys';
import log from '../lib/logger.js';
import * as cheerio from 'cheerio';
import { createCanvas, loadImage } from 'canvas';
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
export async function webpFormatter(buffer, formatFit) {
  return await sharp(buffer)
    .resize(512, 512, {
      fit: formatFit
    })
    .webp()
    .toBuffer();
};
export function cleanFormattingText(text) {
  if (!text || typeof text !== 'string') return text;
  const patterns = [
    /\*~_([^~*_]+)_~*/g,
    /_\*~([^*~_]+)~\*_/g,
    /~_\*([^~*_]+)\*_~/g,
    /\*_~([^~*_]+)~_*/g,
    /_\*([^*_]+)\*_/g,
    /\*_([^*_]+)_*/g,

    /\*~([^~*]+)~\*/g,
    /~\*([^~*]+)\*~/g,
    /_~([^~_]+)~_/g,
    /~_([^~_]+)_~/g,

    /\*{1,2}([^*]+)\*{1,2}/g,
    /_{1,2}([^_]+)_{1,2}/g,
    /~{1,2}([^~]+)~{1,2}/g,
    /```([^`]+)```/g
  ];
  let cleanedText = text;
  patterns.forEach(pattern => {
    cleanedText = cleanedText.replace(pattern, '$1');
  });
  return cleanedText.trim();
};
export function formatTimestampToHourMinute(ts) {
  if (ts.toString().length === 13) ts = Math.floor(ts / 1000);
  const date = new Date(ts * 1000);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}.${minutes}`;
};
export async function fetchJson(url, options = {}) {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
      },
      ...options
    });
    return data;
  } catch (error) {
    await log(`Error fetchJson: ${url}.\n${error}`, true);
    throw error;
  }
};
export async function jadwalSholat(kode_daerah) {
  try {
    const response = await axios.get('https://jadwalsholat.org/jadwal-sholat/daily.php?id=' + kode_daerah);
    const html = response.data;
    const $ = cheerio.load(html);
    const daerah = $('h1').text().trim();
    const bulan = $('h2').text().trim();
    const row = $('tr.table_light, tr.table_dark').find('td');
    const tanggal = $(row[0]).text().trim();
    const imsyak = $(row[1]).text().trim();
    const shubuh = $(row[2]).text().trim();
    const terbit = $(row[3]).text().trim();
    const dhuha = $(row[4]).text().trim();
    const dzuhur = $(row[5]).text().trim();
    const ashr = $(row[6]).text().trim();
    const maghrib = $(row[7]).text().trim();
    const isya = $(row[8]).text().trim();
    return {
      daerah,
      bulan,
      tanggal,
      imsyak,
      shubuh,
      terbit,
      dhuha,
      dzuhur,
      ashr,
      maghrib,
      isya
    };
  }
  catch (error) {
    await log(`Error jadwalSholat:\n${error}`, true);
    return {
      status: 'error',
      error: error.message
    };
  }
};