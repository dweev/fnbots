// ─── Info ───────────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── info src/function/function2.js ─────────────

import path from 'path';
import fs from 'fs-extra';
import sharp from 'sharp';
import log from '../lib/logger.js';
import * as cheerio from 'cheerio';
import config from '../../config.js';
import { spawn } from 'child_process';
import { getBuffer } from './index.js';
import { tmpDir } from '../lib/tempManager.js';
import { createCanvas, loadImage } from 'canvas';
import { Downloader } from '@tobyg74/tiktok-api-dl';
import { delay, extractMessageContent } from 'baileys';
import { fetch as nativeFetch, sticker as stickerNative, addExif as addExifNative, parseArgsToFetchOptions, getHeader } from '../addon/bridge.js';

const ffmpegFilters = new Map([
  ['8d',         { flag: '-af',             filter: 'apulsator=hz=0.3'                                                                          }],
  ['alien',      { flag: '-af',             filter: 'asetrate=44100*0.5, atempo=2'                                                              }],
  ['bass',       { flag: '-af',             filter: 'equalizer=f=54:width_type=o:width=2:g=20'                                                  }],
  ['blown',      { flag: '-af',             filter: 'acrusher=.1:1:64:0:log'                                                                    }],
  ['chipmunk',   { flag: '-af',             filter: 'atempo=0.5,asetrate=65100'                                                                 }],
  ['deep',       { flag: '-af',             filter: 'atempo=4/4,asetrate=44500*2/3'                                                             }],
  ['demonic',    { flag: '-af',             filter: 'asetrate=44100*0.7, atempo=1.2'                                                            }],
  ['dizzy',      { flag: '-af',             filter: 'aphaser=in_gain=0.4'                                                                       }],
  ['earrape',    { flag: '-af',             filter: 'volume=12'                                                                                 }],
  ['echo',       { flag: '-af',             filter: 'aecho=0.8:0.9:1000:0.3'                                                                    }],
  ['fast',       { flag: '-af',             filter: 'atempo=1.63,asetrate=44100'                                                                }],
  ['fastreverse',{ flag: '-filter_complex', filter: 'areverse,atempo=1.63,asetrate=44100'                                                       }],
  ['fat',        { flag: '-af',             filter: 'atempo=1.6,asetrate=22100'                                                                 }],
  ['ghost',      { flag: '-af',             filter: 'aecho=0.8:0.88:60:0.4'                                                                     }],
  ['haunted',    { flag: '-filter_complex', filter: "afftfilt=real='hypot(re,im)':imag='0'"                                                     }],
  ['nightcore',  { flag: '-af',             filter: 'atempo=1.06,asetrate=44100*1.25'                                                           }],
  ['nightmare',  { flag: '-af',             filter: "afftfilt=real='hypot(re,im)*cos(0.5)':imag='hypot(re,im)*sin(0.5)'"                        }],
  ['radio',      { flag: '-af',             filter: 'highpass=f=200, lowpass=f=3000'                                                            }],
  ['reverse',    { flag: '-filter_complex', filter: 'areverse'                                                                                  }],
  ['robot',      { flag: '-filter_complex', filter: "afftfilt=real='hypot(re,im)*sin(0)':imag='hypot(re,im)*cos(0)':win_size=512:overlap=0.75"  }],
  ['slow',       { flag: '-af',             filter: 'atempo=0.7,asetrate=44100'                                                                 }],
  ['smooth',     { flag: '-filter:v',       filter: 'minterpolate=mi_mode=mci:mc_mode=aobmc:vsbmc=1:fps=120'                                    }],
  ['spooky',     { flag: '-af',             filter: 'asetrate=44100*0.8, atempo=1.1'                                                            }],
  ['telephone',  { flag: '-af',             filter: 'bandpass=f=1000:width_type=h:width=200'                                                    }],
  ['tremolo',    { flag: '-af',             filter: 'tremolo=f=5.0:d=0.8'                                                                       }],
  ['underwater', { flag: '-af',             filter: 'aecho=0.6:0.3:1000:0.5, lowpass=f=300'                                                     }],
  ['vibrato',    { flag: '-af',             filter: 'vibrato=f=5'                                                                               }],
]);

function isWebP(buffer) {
  return buffer.length >= 12 && buffer.slice(0, 4).toString() === 'RIFF' && buffer.slice(8, 12).toString() === 'WEBP';
}
function hasExifMetadata(buffer) {
  if (!isWebP(buffer)) return false;
  let offset = 12;
  while (offset < buffer.length - 8) {
    const chunkHeader = buffer.slice(offset, offset + 4).toString();
    const chunkSize = buffer.readUInt32LE(offset + 4);
    if (chunkHeader === 'EXIF') {
      return true;
    }
    offset += 8 + chunkSize + (chunkSize % 2);
  }
  return false;
}
function runFFMPEGWithBuffer(inputBuffer, filter) {
  return new Promise((resolve, reject) => {
    // prettier-ignore
    const args = [
      '-i', 'pipe:0',
      filter.flag, filter.filter,
      '-f', 'mp3',
      'pipe:1'
    ];
    const ffmpeg = spawn('ffmpeg', args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const chunks = [];
    let errorOutput = '';
    ffmpeg.stdout.on('data', (chunk) => {
      chunks.push(chunk);
    });
    ffmpeg.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    ffmpeg.on('close', (code) => {
      if (code === 0) {
        const outputBuffer = Buffer.concat(chunks);
        if (outputBuffer.length === 0) {
          reject(new Error('FFMPEG created empty output'));
        } else {
          resolve(outputBuffer);
        }
      } else {
        console.error('FFmpeg Error Output:', errorOutput);
        reject(new Error(`FFMPEG exited with code ${code}`));
      }
    });
    ffmpeg.on('error', (err) => {
      reject(new Error(`FFMPEG spawn error: ${err.message}`));
    });
    ffmpeg.stdin.write(inputBuffer);
    ffmpeg.stdin.end();
  });
}
function runImageMagick(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('convert', args);
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      reject(new Error(`ImageMagick spawn error: ${error.message}`));
    });
    child.on('close', (code) => {
      if (code !== 0) {
        const errorMessage = stderr.trim() || `ImageMagick exited with code ${code}`;
        reject(new Error(errorMessage));
      } else {
        resolve();
      }
    });
  });
}
function validateText(text, maxLength = 8) {
  if (!text || text.trim().length === 0) {
    throw new Error('Teks tidak boleh kosong');
  }
  const upperText = text.toUpperCase();
  if (upperText.length > maxLength) {
    throw new Error(`Teks terlalu panjang! Maksimal ${maxLength} huruf`);
  }
  if (/[^A-Z]/.test(upperText)) {
    throw new Error('Teks hanya boleh berisi huruf A-Z');
  }
  return upperText;
}

export async function groupImage(username, groupname, welcometext, profileImagePath) {
  const width = 600;
  const height = 300;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FF7F00';
  ctx.fillRect(0, 0, width, height);
  const darkAreaHeight = 60;
  const darkAreasY = [30, 120, 210];
  ctx.fillStyle = '#333333';
  for (const y of darkAreasY) {
    ctx.fillRect(0, y, width, darkAreaHeight);
  }
  let profileImage;
  try {
    profileImage = await loadImage(profileImagePath);
  } catch {
    await log(`Tidak bisa load gambar profil, fallback.`);
    profileImage = await loadImage(await fs.readFile(config.paths.avatar));
  }
  const profileSize = 160;
  const profileX = 30;
  const profileY = (height - profileSize) / 2;
  ctx.drawImage(profileImage, profileX, profileY, profileSize, profileSize);
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 60;
  const gap = 30;
  const firstLineX = profileX + profileSize;
  const spacing = 90;
  for (let i = 0; i < 3; i++) {
    const offsetX = firstLineX + i * spacing;
    const startX = offsetX;
    const startY = height;
    const endX = offsetX + height;
    const endY = 0;
    ctx.beginPath();
    ctx.moveTo(startX + gap, startY + gap);
    ctx.lineTo(endX - gap, endY - gap);
    ctx.stroke();
  }
  function trimTextToWidth(text, maxWidth) {
    let trimmedText = text;
    while (ctx.measureText(trimmedText).width > maxWidth && trimmedText.length > 0) {
      trimmedText = trimmedText.slice(0, -1);
    }
    if (trimmedText.length < text.length) {
      trimmedText = trimmedText.slice(0, -3) + '...';
    }
    return trimmedText;
  }
  ctx.fillStyle = '#FF7F00';
  ctx.font = '30px sans-serif';
  ctx.textAlign = 'left';
  const textX = profileX + profileSize + 30;
  const maxWidth = width - textX - 20;
  ctx.fillText(trimTextToWidth(welcometext, maxWidth), textX, darkAreasY[0] + 40);
  ctx.fillText(trimTextToWidth('#' + groupname, maxWidth), textX, darkAreasY[1] + 40);
  ctx.fillText(trimTextToWidth('@' + username, maxWidth), textX, darkAreasY[2] + 40);
  return canvas.toBuffer('image/png');
}
export async function imageGenerator({ type, text1, text2, text3, outputFormat = 'jpg' }) {
  if (!type) {
    throw new Error('Type is required (tahta, harta, or create)');
  }
  let annotationText;
  let validatedTexts = [];
  try {
    if (type === 'tahta' || type === 'harta') {
      if (!text1) {
        throw new Error('Text is required');
      }
      const validated = validateText(text1);
      validatedTexts.push(validated);
      annotationText = `HARTA\nTAHTA\n${validated}`;
    } else if (type === 'create') {
      if (!text1 || !text2 || !text3) {
        throw new Error('Three texts are required for create mode');
      }
      validatedTexts = [validateText(text1), validateText(text2), validateText(text3)];
      annotationText = validatedTexts.join('\n');
    } else {
      throw new Error(`Unknown type: ${type}. Use tahta, harta, or create`);
    }
  } catch (error) {
    log(`[ImageGenerator] Validation failed: ${error.message}`, true);
    throw error;
  }
  const outputFile = tmpDir.createTempFile(`output-${type}.jpg`);
  try {
    // prettier-ignore
    const convertArgs = [
      '-size', '512x512',
      '-background', 'black',
      'xc:black',
      '-pointsize', '90',
      '-font', './src/fonts/harta.ttf',
      '-gravity', 'center',
      '-tile', './src/image/rainbow.jpg',
      '-annotate', '+0+0', annotationText,
      '-wave', '4.5x64',
      outputFile
    ];
    await runImageMagick(convertArgs);
    if (!(await fs.pathExists(outputFile))) {
      throw new Error('ImageMagick did not create output file');
    }
    const outputStats = await fs.stat(outputFile);
    if (outputStats.size === 0) {
      throw new Error('ImageMagick created empty output file');
    }
    let outputBuffer;
    if (outputFormat === 'webp' || type === 'harta' || type === 'create') {
      outputBuffer = await sharp(outputFile).webp().toBuffer();
    } else {
      outputBuffer = await fs.readFile(outputFile);
    }
    if (!Buffer.isBuffer(outputBuffer)) {
      throw new Error('Output is not a Buffer');
    }
    if (outputBuffer.length === 0) {
      throw new Error('Output buffer is empty');
    }
    return outputBuffer;
  } catch (error) {
    log(`[ImageGenerator] Processing failed: ${error.message}`, true);
    throw error;
  } finally {
    await tmpDir.deleteFile(outputFile);
  }
}
export async function fetchMedia({ argsArray }) {
  const { url, options } = parseArgsToFetchOptions(argsArray);
  try {
    const response = await nativeFetch(url, options);
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`Gagal dengan status: ${response.status}\n${errorText}`);
    }
    const bodyBuffer = await response.arrayBuffer();
    const contentType = getHeader(response.headers, 'content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        const text = bodyBuffer.toString('utf-8');
        const parsedJson = JSON.parse(text);
        return { type: 'text', content: JSON.stringify(parsedJson, null, 2) };
      } catch {
        return { type: 'text', content: bodyBuffer.toString('utf-8') };
      }
    }
    const isDirectDownload = contentType.startsWith('image/') || contentType.startsWith('audio/') || contentType.startsWith('video/') || contentType.startsWith('application/pdf') || contentType.startsWith('application/zip') || contentType.startsWith('application/octet-stream');
    if (isDirectDownload) {
      let extension = '';
      try {
        const urlPath = new URL(url).pathname;
        extension = path.extname(urlPath).substring(1);
      } catch {
        // Ignore URL parsing errors
      }
      if (!extension) {
        const ctParts = contentType.split('/');
        if (ctParts.length > 1) {
          extension = ctParts[1].split(';')[0];
        }
      }
      const tempFilePath = tmpDir.createTempFile(extension, 'fetch-');
      await fs.writeFile(tempFilePath, bodyBuffer);
      return {
        type: 'local_file',
        path: tempFilePath
      };
    }
    if (contentType.includes('text/html')) {
      const pageContentString = bodyBuffer.toString('utf-8');
      const preMatch = pageContentString.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
      if (preMatch && preMatch[1]) {
        try {
          const jsonData = JSON.parse(preMatch[1]);
          return { type: 'text', content: JSON.stringify(jsonData, null, 2) };
        } catch {
          // If parsing fails, fall through to return raw text
        }
      }
      const videoMatch = pageContentString.match(/<video[^>]*>[\s\S]*?<source[^>]+src=["']([^"']+)["']/i);
      if (videoMatch && videoMatch[1]) {
        let src = videoMatch[1];
        try {
          src = new URL(src, url).href;
        } catch {
          // Ignore URL parsing errors
        }
        return { type: 'url', content: src };
      }
      const audioMatch = pageContentString.match(/<audio[^>]*>[\s\S]*?<source[^>]+src=["']([^"']+)["']/i);
      if (audioMatch && audioMatch[1]) {
        let src = audioMatch[1];
        try {
          src = new URL(src, url).href;
        } catch {
          // Ignore URL parsing errors
        }
        return { type: 'url', content: src };
      }
      const imageMatch = pageContentString.match(/<image[^>]*>[\s\S]*?<source[^>]+src=["']([^"']+)["']/i);
      if (imageMatch && imageMatch[1]) {
        let src = imageMatch[1];
        try {
          src = new URL(src, url).href;
        } catch {
          // Ignore URL parsing errors
        }
        return { type: 'url', content: src };
      }
      return { type: 'text', content: pageContentString };
    }
    const plainText = bodyBuffer.toString('utf-8');
    return { type: 'text', content: plainText };
  } catch (error) {
    if (error.message && error.message.includes('Gagal dengan status:')) {
      log(error.message, true);
      throw error;
    }
    const errorMessage = error.message || String(error);
    if (errorMessage.includes('curl perform error:')) {
      log(`Tidak ada respons dari server: ${errorMessage}`, true);
      throw new Error(`Tidak ada respons dari server: ${errorMessage}`);
    }
    log(`Terjadi error: ${errorMessage}`, true);
    throw new Error(`Terjadi error: ${errorMessage}`);
  }
}
export async function createNativeSticker({ mediaBuffer, packName, authorName, crop, forceUpdateExif = false, ...otherOptions }) {
  if (!mediaBuffer) throw new Error('mediaBuffer is required in worker');
  const finalBuffer = ensureBuffer(mediaBuffer);
  const stickerOptions = {
    packName: packName || 'Sticker Pack',
    authorName: authorName || 'Author',
    crop: crop ?? false,
    ...otherOptions
  };
  const isAlreadyWebP = isWebP(finalBuffer);
  const hasExif = hasExifMetadata(finalBuffer);
  let result;
  if (isAlreadyWebP) {
    if (hasExif && !forceUpdateExif) {
      result = finalBuffer;
    } else {
      result = await addExifNative(finalBuffer, stickerOptions);
    }
  } else {
    result = await stickerNative(finalBuffer, stickerOptions);
  }
  if (!result || !Buffer.isBuffer(result)) throw new Error(`Native function returned invalid data: ${typeof result}`);
  if (result.length === 0) throw new Error('Native function returned empty buffer');
  return result;
}
export async function audioChanger({ mediaBuffer, filterName }) {
  if (!mediaBuffer) throw new Error('mediaBuffer is required but received undefined');
  let finalBuffer;
  try {
    finalBuffer = ensureBuffer(mediaBuffer);
  } catch (error) {
    log(`[AudioChanger] Buffer conversion failed: ${error.message}`, true);
    throw error;
  }
  if (finalBuffer.length === 0) throw new Error('Audio buffer is empty');
  let selectedFilter;
  if (filterName) {
    selectedFilter = ffmpegFilters.get(filterName);
    if (!selectedFilter) {
      const availableFilters = Array.from(ffmpegFilters.keys()).join(', ');
      throw new Error(`Filter "${filterName}" not found. Available: ${availableFilters}`);
    }
  } else {
    const filterKeys = Array.from(ffmpegFilters.keys());
    const randomKey = filterKeys[Math.floor(Math.random() * filterKeys.length)];
    selectedFilter = ffmpegFilters.get(randomKey);
  }
  try {
    const outputBuffer = await runFFMPEGWithBuffer(finalBuffer, selectedFilter);
    if (!Buffer.isBuffer(outputBuffer)) throw new Error('Output is not a Buffer');
    if (outputBuffer.length === 0) throw new Error('Output buffer is empty');
    return outputBuffer;
  } catch (error) {
    log(`Processing failed: ${error.message}`, true);
    throw error;
  }
}
export async function handleBufferInput(input) {
  try {
    return ensureBuffer(input);
  } catch {
    // If fails, try async methods
  }
  if (typeof input === 'string') {
    if (/^https?:\/\//.test(input)) {
      return await getBuffer(input);
    }
    try {
      const stats = await fs.stat(input);
      if (stats.isFile()) {
        return await fs.readFile(input);
      }
    } catch {
      // Not a valid file path
    }
  }
  // prettier-ignore
  throw new Error(
    `Cannot convert to Buffer (async): type=${typeof input}, ` +
    `constructor=${input?.constructor?.name}`
  );
}
export function ensureBuffer(input) {
  if (Buffer.isBuffer(input)) {
    return input;
  }
  if (input && input.type === 'Buffer' && input.data) {
    if (Array.isArray(input.data)) {
      return Buffer.from(input.data);
    }
  }
  if (typeof input === 'string') {
    if (/^data:.*?\/.*?;base64,/i.test(input)) {
      return Buffer.from(input.split(',')[1], 'base64');
    }
    try {
      const buffer = Buffer.from(input, 'base64');
      if (buffer.toString('base64') === input) {
        return buffer;
      }
    } catch {
      // Not valid base64, continue
    }
  }
  if (input instanceof ArrayBuffer) {
    return Buffer.from(input);
  }
  if (ArrayBuffer.isView(input)) {
    return Buffer.from(input);
  }
  if (typeof input.length === 'number' && typeof input[0] === 'number') {
    return Buffer.from(input);
  }
  if (typeof input === 'object' && input !== null) {
    if (input.data) {
      return Buffer.from(input.data);
    }
    if (input.buffer) {
      return Buffer.from(input.buffer);
    }
  }
  // prettier-ignore
  throw new Error(
    `Cannot convert to Buffer: type=${typeof input}, ` +
    `constructor=${input?.constructor?.name}, ` +
    `isArray=${Array.isArray(input)}, ` +
    `hasData=${input?.data !== undefined}`
  );
}
export function isBufferEmpty(buffer) {
  return !buffer || !Buffer.isBuffer(buffer) || buffer.length === 0;
}
export function validateAndConvertBuffer(input, context = 'unknown') {
  try {
    const buffer = ensureBuffer(input);
    if (isBufferEmpty(buffer)) {
      throw new Error('Buffer is empty');
    }
    return buffer;
  } catch (error) {
    const errorDetails = {
      context,
      error: error.message,
      inputAnalysis: {
        type: typeof input,
        isArray: Array.isArray(input),
        isBuffer: Buffer.isBuffer(input),
        isArrayBuffer: input instanceof ArrayBuffer,
        isArrayBufferView: ArrayBuffer.isView(input),
        hasLength: input?.length !== undefined,
        length: input?.length,
        constructorName: input?.constructor?.name
      }
    };
    // prettier-ignore
    throw new Error(
      `Buffer conversion failed in ${context}: ${error.message}\n` +
      `Input analysis: ${JSON.stringify(errorDetails.inputAnalysis, null, 2)}`
    );
  }
}
export function rehydrateBuffer(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  try {
    const isBufferLike = (obj.type === 'Buffer' && obj.data) || obj instanceof Uint8Array || obj instanceof ArrayBuffer || ArrayBuffer.isView(obj) || (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === 'number');
    if (isBufferLike) {
      return ensureBuffer(obj);
    }
  } catch {
    // Not a buffer-like object, continue processing
  }
  if (!Array.isArray(obj)) {
    const keys = Object.keys(obj);
    const hasNumericKeys = keys.length > 0 && keys.every((key) => !isNaN(parseInt(key)));
    if (hasNumericKeys && !obj.type) {
      try {
        const maxIndex = Math.max(...keys.map((k) => parseInt(k)));
        const arr = new Array(maxIndex + 1);
        for (const key in obj) {
          arr[parseInt(key)] = obj[key];
        }
        return ensureBuffer(arr);
      } catch {
        // Failed to convert, continue as object
      }
    }
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => rehydrateBuffer(item));
  }
  if (obj.data && !obj.type) {
    try {
      return ensureBuffer(obj.data);
    } catch {
      // Not a valid buffer, continue
    }
  }
  if (obj.buffer && !obj.type) {
    try {
      return ensureBuffer(obj.buffer);
    } catch {
      // Not a valid buffer, continue
    }
  }
  const cloned = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = rehydrateBuffer(obj[key]);
    }
  }
  return cloned;
}
export function cleanYoutubeUrl(url) {
  // prettier-ignore
  return url.replace(/(&|\?)list=[^&]*/i, '$1').replace(/(&|\?)index=[^&]*/i, '$1').replace(/[&?]$/, '');
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
    `❤️ *Likes:* ${result.statistics?.likeCount || 0}\n` +
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
