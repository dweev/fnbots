// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info Function.js ────────────────────

import ffmpeg from '@ts-ffmpeg/fluent-ffmpeg';
import dayjs from './dayjs.js';
import log from './logger.js';
import fs from 'fs-extra';
import axios from 'axios';
import path from 'path';
import webp from 'node-webpmux';
import FileType from 'file-type';
import { getDbSettings } from './settingsManager.js';

export function getSizeMedia(crots) {
  return new Promise((resolve, reject) => {
    if (typeof crots === 'string' && /http/.test(crots)) {
      axios.get(crots).then((res) => {
        let length = parseInt(res.headers['content-length']);
        if (!isNaN(length)) resolve(bytesToSize(length, 3));
      }).catch(reject);
    } else if (Buffer.isBuffer(crots)) {
      let length = Buffer.byteLength(crots);
      if (!isNaN(length)) resolve(bytesToSize(length, 3));
    } else {
      reject(0);
    };
  });
};
export function archimed(s, list) {
  const ln = list.length;
  const ls = new Set();
  for (let logic of s.split(',')) {
    if (logic.includes('>')) {
      const si = parseInt(logic.slice(1)) - 1;
      for (let i = si + 1; i < ln; i++) ls.add(i);
    } else if (logic.includes('<')) {
      const si = parseInt(logic.slice(1)) - 1;
      for (let i = 0; i <= si && i < ln; i++) ls.add(i);
    } else if (logic.includes('-')) {
      let [start, end] = logic.split('-').map(n => parseInt(n) - 1);
      for (let i = start; i <= end && i < ln; i++) ls.add(i);
    } else {
      const idx = parseInt(logic) - 1;
      if (idx >= 0 && idx < ln) ls.add(idx);
    }
  }
  return [...ls].map(i => list[i]);
};
export function bytesToSize(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};
export function color(text, color = 'green') {
  if (text === undefined || text === null) {
    return '';
  }
  if (typeof color === 'string' && color.startsWith('#')) {
    try {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
    } catch {
      return text;
    }
  }
  switch (color) {
    case 'red':
      return '\x1b[31m' + text + '\x1b[0m';
    case 'yellow':
      return '\x1b[33m' + text + '\x1b[0m';
    case 'blue':
      return '\x1b[34m' + text + '\x1b[0m';
    case 'magenta':
      return '\x1b[35m' + text + '\x1b[0m';
    case 'cyan':
      return '\x1b[36m' + text + '\x1b[0m';
    default:
      return '\x1b[32m' + text + '\x1b[0m';
  }
};
export function waktu(seconds) {
  seconds = Number(seconds);
  var y = Math.floor(seconds % (60 * 60 * 24 * 30 * 12 * 256) / (60 * 60 * 24 * 30 * 12));
  var b = Math.floor(seconds % (60 * 60 * 24 * 30 * 12) / (60 * 60 * 24 * 30));
  var w = Math.floor(seconds % (60 * 60 * 24 * 7) / (60 * 60 * 24 * 7));
  var d = Math.floor(seconds % (60 * 60 * 24 * 30) / (60 * 60 * 24));
  var h = Math.floor(seconds % (60 * 60 * 24) / (60 * 60));
  var m = Math.floor(seconds % (60 * 60) / 60);
  var s = Math.floor(seconds % 60);
  var yDisplay = y > 0 ? y + (y == 1 ? " year, " : " years, ") : "";
  var bDisplay = b > 0 ? b + (b == 1 ? " month, " : " months, ") : "";
  var wDisplay = w > 0 ? w + (w == 1 ? " week, " : " weeks, ") : "";
  var dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
  var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
  var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
  var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
  return yDisplay + bDisplay + wDisplay + dDisplay + hDisplay + mDisplay + sDisplay;
};
export function formatDuration(durationStr) {
  const regex = /(\d+)(y|M|d|H|m|s)/g;
  let match;
  let years = 0, months = 0, days = 0, hours = 0, minutes = 0, seconds = 0;
  while ((match = regex.exec(durationStr)) !== null) {
    const value = parseInt(match[1], 10);
    const unit = match[2];
    if (unit === 'y') {
      years = value;
    } else if (unit === 'M') {
      months = value;
    } else if (unit === 'd') {
      days = value;
    } else if (unit === 'H') {
      hours = value;
    } else if (unit === 'm') {
      minutes = value;
    } else if (unit === 's') {
      seconds = value;
    }
  }
  return dayjs.duration({
    years: years,
    months: months,
    days: days,
    hours: hours,
    minutes: minutes,
    seconds: seconds
  });
};
export function formatDurationMessage(duration) {
  let years = duration.years();
  let months = duration.months();
  let days = duration.days();
  let hours = duration.hours();
  let minutes = duration.minutes();
  let seconds = duration.seconds();
  let durationMessage = `*Expired*: `;
  if (years > 0) durationMessage += `${years} year(s) `;
  if (months > 0) durationMessage += `${months} month(s) `;
  if (days > 0) durationMessage += `${days} day(s) `;
  if (hours > 0) durationMessage += `${hours} hour(s) `;
  if (minutes > 0) durationMessage += `${minutes} minute(s) `;
  if (seconds > 0) durationMessage += `${seconds} second(s)`;
  return durationMessage;
};
export function formatCommandList(commandCollection) {
  if (!commandCollection || commandCollection.size === 0) return '';
  const sortedCollection = [...commandCollection].sort();
  return sortedCollection.map(([commandName], i) => `\n${i + 1}. ${commandName}`).join('');
};
export function randomByte(length = 32) {
  const chars = '0123456789ABCDEF';
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }
  return result;
};
export async function mycmd(input) {
  if (Array.isArray(input)) {
    return input;
  }
  return input.split(';').map(cmd => cmd.trim()).filter(cmd => cmd.length > 0);
}
export function msgs(a) {
  if (!a) return;
  return a.length >= 10 ? a.slice(0, 40) : a;
};
export function replacer(key, value) {
  if (typeof value === 'bigint') {
    return value.toString() + 'n';
  }
  if (typeof value === 'object' && value !== null) {
    try {
      JSON.stringify(value);
      return value;
    } catch (e) {
      if (e.message.includes('circular')) {
        return '[Circular]';
      }
      throw e;
    }
  }
  return value;
};
export function reviver(key, value) {
  if (typeof value === 'string' && /^-?\d+n$/.test(value)) {
    return BigInt(value.slice(0, -1));
  };
  return value;
};
export async function deleteFile(path) {
  try {
    const fileExists = await fs.pathExists(path);
    if (fileExists) {
      await fs.unlink(path);
    }
  } catch (error) {
    await log(`Error deleteFile ${path}:\n${error}`, true);
  }
};
export async function gifToWebp(media) {
  const tmpFileIn = path.join(global.tmpDir, `${global.randomSuffix}.gif`);
  const tmpFileOut = path.join(global.tmpDir, `${global.randomSuffix}.webp`);
  await fs.writeFile(tmpFileIn, media);
  await new Promise((resolve, reject) => {
    ffmpeg(tmpFileIn)
      .on('error', reject)
      .on('end', () => resolve(true))
      .addOutputOptions([
        '-vf', 'scale=512:512:force_original_aspect_ratio=decrease',
        '-loop', '0',
        '-preset', 'default',
        '-an', '-vsync', '0'
      ])
      .toFormat('webp')
      .save(tmpFileOut)
  });
  const buff = await fs.readFile(tmpFileOut);
  await deleteFile(tmpFileOut);
  await deleteFile(tmpFileIn);
  return buff;
};
export async function imageToWebp(media) {
  const tmpFileOut = path.join(global.tmpDir, `${global.randomSuffix}.webp`);
  const tmpFileIn = path.join(global.tmpDir, `${global.randomSuffix}.png`);
  await fs.writeFile(tmpFileIn, media);
  await new Promise((resolve, reject) => {
    ffmpeg(tmpFileIn)
      .on('error', reject)
      .on('end', () => resolve(true))
      .addOutputOptions([
        '-vcodec', 'libwebp', '-vf',
        'scale=500:500:force_original_aspect_ratio=decrease,setsar=1, pad=500:500:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse',
        '-loop', '0', '-preset', 'default'
      ])
      .toFormat('webp')
      .save(tmpFileOut)
  });
  const buff = await fs.readFile(tmpFileOut);
  await deleteFile(tmpFileOut);
  await deleteFile(tmpFileIn);
  return buff;
};
export async function videoToWebp(media) {
  const tmpFileOut = path.join(global.tmpDir, `${global.randomSuffix}.webp`);
  const tmpFileIn = path.join(global.tmpDir, `${global.randomSuffix}.mp4`);
  await fs.writeFile(tmpFileIn, media);
  await new Promise((resolve, reject) => {
    ffmpeg(tmpFileIn)
      .on('error', reject)
      .on('end', () => resolve(true))
      .addOutputOptions([
        '-vcodec',
        'libwebp',
        '-vf',
        "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse",
        '-loop',
        '0',
        '-ss',
        '00:00:00',
        '-t',
        '00:00:05',
        '-preset',
        'default',
        '-an',
        '-vsync',
        '0'
      ])
      .toFormat('webp')
      .save(tmpFileOut)
  });
  const buff = await fs.readFile(tmpFileOut);
  await deleteFile(tmpFileOut);
  await deleteFile(tmpFileIn);
  return buff;
};
export async function getBuffer(url, options = {}) {
  try {
    const response = await axios.get(url, {
      headers: {
        'DNT': 1,
        'Upgrade-Insecure-Request': 1
      },
      responseType: 'arraybuffer',
      ...options
    });
    return response.data;
  } catch (error) {
    await log(`Error getBuffer ${url}\n${error}`, true);
    throw error;
  }
};
export async function writeExif(media, data) {
  const dbSettings = getDbSettings();
  const fileType = await FileType.fromBuffer(media);
  if (!fileType) throw new Error('Error_writeExif_FileType');
  let wMedia;
  if (/webp/.test(fileType.mime)) {
    wMedia = media;
  } else if (/image\/gif/.test(fileType.mime)) {
    wMedia = await gifToWebp(media);
  } else if (/jpeg|jpg|png/.test(fileType.mime)) {
    wMedia = await imageToWebp(media);
  } else if (/video/.test(fileType.mime)) {
    wMedia = await videoToWebp(media);
  } else {
    throw new Error('Error_writeExif');
  }
  const tmpFileIn = path.join(global.tmpDir, `${global.randomSuffix}.webp`);
  const tmpFileOut = path.join(global.tmpDir, `FN-${global.randomSuffix}.webp`);
  await fs.writeFile(tmpFileIn, wMedia);
  if (data) {
    const img = new webp.Image();
    const {
      wra = data.pack_id || dbSettings.packID,
      wrb = data.packname || dbSettings.packName,
      wrc = data.author || dbSettings.packAuthor,
      wrd = data.categories || [''],
      wre = data.isAvatar || 0,
      ...wrf
    } = data;
    const json = {
      'sticker-pack-id': wra,
      'sticker-pack-name': wrb,
      'sticker-pack-publisher': wrc,
      'emojis': wrd,
      'is-avatar-sticker': wre,
      ...wrf
    };
    const exifAttr = Buffer.from([0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00]);
    const jsonBuff = Buffer.from(JSON.stringify(json), 'utf-8');
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);
    await img.load(tmpFileIn);
    await deleteFile(tmpFileIn);
    img.exif = exif;
    await img.save(tmpFileOut);
    return tmpFileOut;
  } else {
    return tmpFileIn;
  };
};