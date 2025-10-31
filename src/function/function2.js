// ─── Info ───────────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── info src/function/function2.js ─────────────

import sharp from 'sharp';
import log from '../lib/logger.js';
import * as cheerio from 'cheerio';
import { createCanvas, loadImage } from 'canvas';
import { Downloader } from '@tobyg74/tiktok-api-dl';
import { delay, extractMessageContent } from 'baileys';
import { fetch as nativeFetch } from '../addon/bridge.js';

export function cleanYoutubeUrl(url) {
  return url
    .replace(/(&|\?)list=[^&]*/i, '$1')
    .replace(/(&|\?)index=[^&]*/i, '$1')
    .replace(/[&?]$/, '');
}
export function chunkArray(array, chunkSize) {
  const results = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    results.push(array.slice(i, i + chunkSize));
  }
  return results;
}
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
}
export function buildBaseCaption(result) {
  // prettier-ignore
  return `🎬 *TikTok Downloader*\n\n` +
    `👤 *Author:* @${result.author?.username || 'N/A'}\n` +
    `❤️ *Likes:* ${result.statistics?.diggCount || 0}\n` +
    `💬 *Comments:* ${result.statistics?.commentCount || 0}\n` +
    `🔗 *Shares:* ${result.statistics?.shareCount || 0}\n\n` +
    `📝 *Deskripsi:* ${result.desc || '(Tidak ada deskripsi)'}`;
}
export async function fetchTikTokData(url, version = 'v1') {
  if (!/^https?:\/\/(www\.|vt\.|vm\.|t\.)?tiktok\.com(\/|$)/.test(url)) {
    throw new Error('URL yang Kamu berikan sepertinya bukan link TikTok yang valid.');
  }
  const data = await Downloader(url, { version });
  if (data.status !== 'success' || !data.result) {
    throw new Error('Gagal memproses permintaan tiktok. API downloader mungkin bermasalah, link tidak valid, atau video bersifat pribadi.');
  }
  return data.result;
}
export async function sendImages(fn, result, args, toId, m, baseCaption) {
  const imageSelection = args[1];
  let imagesToSend;
  if (imageSelection) {
    const indicesToDownload = parseImageSelection(imageSelection, result.images.length);
    if (indicesToDownload.length === 0) {
      // prettier-ignore
      throw new Error(
        `Format pemilihan gambar salah!\n` +
        `Total: ${result.images.length}\n` +
        `Contoh: \`.tt [url] 1,3,5\` atau \`.tt [url] 2-5\``
      );
    }
    imagesToSend = indicesToDownload.map((index) => ({
      url: result.images[index],
      index: index
    }));
  } else {
    imagesToSend = result.images.map((url, index) => ({ url, index }));
  }
  if (imagesToSend.length === 1) {
    const caption = `${baseCaption}\n\n*Gambar ${imagesToSend[0].index + 1} dari ${result.images.length}*`;
    return await fn.sendFileUrl(toId, imagesToSend[0].url, caption, m);
  }
  try {
    const downloadedImages = [];
    const errors = [];
    const totalImages = imagesToSend.length;
    for (let i = 0; i < totalImages; i++) {
      try {
        const { url, index } = imagesToSend[i];
        const response = await nativeFetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://www.tiktok.com/'
          }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const buffer = await response.arrayBuffer();
        if (!buffer || buffer.byteLength === 0) throw new Error('Empty buffer');
        downloadedImages.push({
          image: Buffer.from(buffer),
          caption: `${baseCaption}\n\n*Gambar ${index + 1} dari ${result.images.length}*`
        });
      } catch (downloadError) {
        const errorMsg = downloadError?.message || String(downloadError);
        errors.push(`Image ${i + 1}: ${errorMsg}`);
      }
    }
    if (downloadedImages.length === 0) {
      // prettier-ignore
      throw new Error(
        `Gagal mendownload semua gambar!\n\n` +
        `Errors:\n${errors.join('\n')}`
      );
    }
    const chunks = chunkArray(downloadedImages, 100);
    for (const [chunkIndex, chunk] of chunks.entries()) {
      await fn.sendAlbum(toId, chunk, { quoted: m });
      if (chunks.length > 1 && chunkIndex < chunks.length - 1) {
        await delay(2000);
      }
    }
    if (errors.length > 0) {
      // prettier-ignore
      await fn.sendReply(
        toId,
        `*Berhasil:* ${downloadedImages.length}/${totalImages} gambar\n\n` +
        `*Gagal:*\n${errors.slice(0, 5).join('\n')}` +
        (errors.length > 5 ? `\n... dan ${errors.length - 5} lainnya` : ''),
        { quoted: m }
      );
    }
  } catch (error) {
    throw error;
  }
}
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
}
export async function webpFormatter(buffer, formatFit) {
  return await sharp(buffer)
    .resize(512, 512, {
      fit: formatFit
    })
    .webp()
    .toBuffer();
}
export function cleanFormattingText(text) {
  if (!text || typeof text !== 'string') return text;
  // prettier-ignore
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
  patterns.forEach((pattern) => {
    cleanedText = cleanedText.replace(pattern, '$1');
  });
  return cleanedText.trim();
}
export function formatTimestampToHourMinute(ts) {
  if (ts.toString().length === 13) ts = Math.floor(ts / 1000);
  const date = new Date(ts * 1000);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}.${minutes}`;
}
function redactUrlSecrets(urlString) {
  try {
    const urlObj = new URL(urlString);
    if (urlObj.searchParams.has('appid')) {
      urlObj.searchParams.set('appid', 'REDACTED');
    }
    return urlObj.toString();
  } catch {
    return urlString;
  }
}
export async function fetchJson(url, options = {}) {
  try {
    const { headers: optionHeaders, ...restOptions } = options;
    const response = await nativeFetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36',
        ...optionHeaders
      },
      ...restOptions
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch JSON: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    const safeUrl = redactUrlSecrets(url);
    await log(`Error fetchJson: ${safeUrl}.\n${error}`, true);
    throw error;
  }
}
export async function jadwalSholat(kode_daerah) {
  try {
    const response = await nativeFetch('https://jadwalsholat.org/jadwal-sholat/daily.php?id=' + kode_daerah);
    if (!response.ok) throw new Error(`Gagal mengambil data jadwal sholat: ${response.status} ${response.statusText}`);
    const html = await response.text();
    const $ = cheerio.load(html);
    const daerah = $('h1').text().trim();
    const bulan = $('h2').text().trim();
    const row = $('tr.table_light, tr.table_dark').find('td');
    if (row.length < 9) throw new Error('Gagal mem-parsing tabel jadwal sholat. Strukturnya mungkin berubah.');
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
  } catch (error) {
    await log(`Error jadwalSholat:\n${error}`, true);
    return {
      status: 'error',
      message: error.message
    };
  }
}
export async function getZodiak(nama, tgl) {
  try {
    const encodedNama = encodeURIComponent(nama);
    const encodedTgl = encodeURIComponent(tgl);
    const url = `https://script.google.com/macros/exec?service=AKfycbw7gKzP-WYV2F5mc9RaR7yE3Ve1yN91Tjs91hp_jHSE02dSv9w&nama=${encodedNama}&tanggal=${encodedTgl}`;
    const response = await nativeFetch(url);
    if (!response.ok) {
      throw new Error(`Gagal mengambil data zodiak: ${response.status} ${response.statusText}`);
    }
    const { lahir, usia, ultah, zodiak } = await response.json();
    let text = `*Nama*: ${nama}\n`;
    text += `*Lahir*: ${lahir}\n`;
    text += `*Usia*: ${usia}\n`;
    text += `*Ultah*: ${ultah}\n`;
    text += `*Zodiak*: ${zodiak}`;
    return text;
  } catch (error) {
    await log(`Error getZodiak:\n${error}`, true);
    throw error;
  }
}
export function normalizeResult(result) {
  const normalized = {
    type: result.type,
    desc: result.desc || '',
    author: result.author || {},
    statistics: result.statistics || {},
    hashtag: result.hashtag || [],
    music: result.music || {},
    images: result.images || [],
    videoUrl: null
  };
  if (result.type === 'video') {
    if (result.video?.playAddr) {
      normalized.videoUrl = Array.isArray(result.video.playAddr) ? result.video.playAddr[0] : result.video.playAddr;
    } else if (result.videoHD) {
      normalized.videoUrl = result.videoHD;
    } else if (result.videoWatermark) {
      normalized.videoUrl = result.videoWatermark;
    } else if (result.direct) {
      normalized.videoUrl = result.direct;
    }
  }
  return normalized;
}
export function normalizeMentionsInBody(body, originalMentionedJids, resolvedMentionedJids) {
  if (!body || !Array.isArray(originalMentionedJids) || !Array.isArray(resolvedMentionedJids)) return body;
  let normalizedBody = body;
  const lidToJidMap = new Map();
  for (let i = 0; i < Math.min(originalMentionedJids.length, resolvedMentionedJids.length); i++) {
    const original = originalMentionedJids[i];
    const resolved = resolvedMentionedJids[i];
    if (original !== resolved && original.endsWith('@lid') && resolved.endsWith('@s.whatsapp.net')) {
      const lidNumber = original.split('@')[0];
      const jidNumber = resolved.split('@')[0];
      lidToJidMap.set(lidNumber, jidNumber);
    }
  }
  for (const [lidNumber, jidNumber] of lidToJidMap.entries()) {
    const patterns = [new RegExp(`@\\+?\\s*${lidNumber.replace(/(\d)/g, '$1\\s*')}\\b`, 'g'), new RegExp(`@${lidNumber}\\b`, 'g')];
    for (const pattern of patterns) {
      normalizedBody = normalizedBody.replace(pattern, `@${jidNumber}`);
    }
  }
  return normalizedBody;
}
export function unwrapMessage(msg) {
  if (!msg || typeof msg !== 'object') return null;
  if (msg.ephemeralMessage?.message) return unwrapMessage(msg.ephemeralMessage.message);
  if (msg.viewOnceMessage?.message) return unwrapMessage(msg.viewOnceMessage.message);
  if (msg.documentWithCaptionMessage?.message) return unwrapMessage(msg.documentWithCaptionMessage.message);
  if (msg.viewOnceMessageV2?.message) return unwrapMessage(msg.viewOnceMessageV2.message);
  if (msg.viewOnceMessageV2Extension?.message) return unwrapMessage(msg.viewOnceMessageV2Extension.message);
  if (msg.editedMessage?.message) {
    const innerMsg = msg.editedMessage.message;
    if (innerMsg.protocolMessage?.type === 14 && innerMsg.protocolMessage?.editedMessage) {
      return unwrapMessage(innerMsg.protocolMessage.editedMessage);
    }
    return unwrapMessage(innerMsg);
  }
  if (msg.contextInfo?.quotedMessage) msg.contextInfo.quotedMessage = unwrapMessage(msg.contextInfo.quotedMessage);
  if (msg.message) {
    const extracted = extractMessageContent(msg.message);
    if (extracted) msg.message = extracted;
  }
  return msg;
}
