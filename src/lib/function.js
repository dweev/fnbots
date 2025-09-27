// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info function.js ────────────────────

import util from 'util';
import path from 'path';
import sharp from 'sharp';
import fs from 'fs-extra';
import axios from 'axios';
import Fuse from 'fuse.js';
import log from './logger.js';
import { dirname } from 'path';
import webp from 'node-webpmux';
import FileType from 'file-type';
import { fileURLToPath } from 'url';
import config from '../../config.js';
import dayjs from '../utils/dayjs.js';
import { Worker } from 'worker_threads';
import { tmpDir } from './tempManager.js';
import { pluginCache } from './plugins.js';
import ffmpeg from '@ts-ffmpeg/fluent-ffmpeg';
import { exec as cp_exec } from 'child_process';
import { createCanvas, loadImage } from 'canvas';
import { getDbSettings } from './settingsManager.js';
import { StoreMessages, User, StoreGroupMetadata, mongoStore } from '../../database/index.js';

const exec = util.promisify(cp_exec);
let fuse;
let allCmds           = [];
let _checkVIP         = false;
let _checkPremium     = false;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const fuseOptions = { includeScore: true, threshold: 0.25, minMatchCharLength: 2, distance: 25 };

function runStickerConversion(media, type) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(path.resolve(__dirname, '..', 'worker', 'sticker_worker.js'));
    worker.postMessage({ mediaBuffer: media, type: type });
    worker.on('message', (result) => {
      if (result.status === 'done') {
        resolve(Buffer.from(result.buffer));
      } else {
        reject(new Error(result.error));
      }
      worker.terminate();
    });
    worker.on('error', (err) => {
      reject(err);
      worker.terminate();
    });
    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker berhenti dengan error code ${code}`));
    });
  });
};

export async function initializeFuse() {
  allCmds = Array.from(pluginCache.commands.keys());
  fuse = new Fuse(allCmds, fuseOptions);
};
export async function textMatch1(fn, m, lt, toId) {
  const suggestions = [];
  const seenTypo = new Set();
  for (const typo of lt) {
    const firstWord = typo.trim().split(/\s+/)[0].toLowerCase();
    if (allCmds.includes(firstWord) || seenTypo.has(firstWord)) continue;
    seenTypo.add(firstWord);
    const results = fuse.search(firstWord);
    if (results.length > 0) {
      const bestMatch = results[0].item;
      if (bestMatch !== firstWord) {
        suggestions.push({ from: firstWord, to: bestMatch });
      }
    }
  }
  if (suggestions.length > 0) {
    const suggestionText = [
      "*Mungkinkah yang kamu maksud:*",
      ...suggestions.map(s => `• ${s.from} → ${s.to}`)
    ].join("\n");
    await fn.sendPesan(toId, suggestionText, m);
  }
};
export async function textMatch2(lt) {
  if (Array.isArray(lt)) {
    lt = lt.join(' ; ');
  }
  const commands = lt.split(';').map(cmd => cmd.trim()).filter(cmd => cmd.length > 0);
  const correctedCommands = [];
  let hasCorrections = false;
  for (const command of commands) {
    const parts = command.trim().split(/\s+/);
    const commandName = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');
    const results = fuse.search(commandName);
    if (results.length > 0 && results[0].score <= fuseOptions.threshold) {
      const bestMatch = results[0].item;
      let correctedCommand = bestMatch;
      if (args) {
        correctedCommand += ' ' + args;
      }
      correctedCommands.push(correctedCommand);
      if (commandName !== bestMatch) {
        hasCorrections = true;
      }
    } else {
      correctedCommands.push(command);
    }
  }
  return hasCorrections ? correctedCommands : null;
};
export async function shutdown(isPm2) {
  if (isPm2) {
    try {
      await exec(`pm2 stop ${process.env.pm_id}`);
    } catch {
      process.exit(1);
    }
  } else {
    process.exit(0);
  }
};
export async function checkCommandAccess(command, userData, user, maintenance) {
  const {
    isSadmin, isMaster, isVIP, isPremium,
    isGroupAdmins, isWhiteList, hakIstimewa, isMuted
  } = userData;
  if (isSadmin) return true;
  let userLevel = 'userBiasa';
  if (isMaster) userLevel = 'master';
  else if (isVIP) userLevel = 'vip';
  else if (isPremium) userLevel = 'premium';
  else if (isGroupAdmins) userLevel = 'groupAdmin';
  const forbiddenCategories = {
    master:     ['master', 'owner'],
    vip:        ['master', 'owner', 'bot'],
    premium:    ['master', 'owner', 'bot', 'vip'],
    groupAdmin: ['master', 'owner', 'bot', 'vip', 'premium'],
    userBiasa:  ['master', 'owner', 'bot', 'vip', 'premium', 'manage']
  };
  if (forbiddenCategories[userLevel] && forbiddenCategories[userLevel].includes(command.category)) {
    return false;
  }
  const isAllowedByState = (maintenance && (isWhiteList || hakIstimewa)) || (!maintenance && (hakIstimewa || !isMuted));
  if (!isAllowedByState) return false;
  const isLimited = await user.isLimit();
  const isGameLimited = await user.isGameLimit();
  if (isLimited && isGameLimited) {
    if (!command.isCommandWithoutPayment) return false;
  } else if (isLimited) {
    if (!command.isLimitGameCommand && !command.isCommandWithoutPayment) return false;
  } else if (isGameLimited) {
    if (!command.isLimitCommand && !command.isCommandWithoutPayment) return false;
  }
  return true;
}
export async function isUserVerified(m, dbSettings, StoreGroupMetadata, fn, sReply, hakIstimewa) {
  if (m.fromMe || hakIstimewa) return true;
  if (m.isGroup) return true;
  try {
    const metadata = await StoreGroupMetadata.findOne({ groupId: dbSettings.groupIdentity }).lean();
    if (!metadata) return true;
    const isParticipant = metadata.participants.some(p => p.id === m.sender);
    if (isParticipant) return true;
    const botParticipant = metadata.participants.find(p => p.id === m.botnumber);
    if (botParticipant && botParticipant.admin) {
      const inviteCode = await fn.groupInviteCode(dbSettings.groupIdentity);
      await sReply(`Untuk menggunakan bot, Anda harus bergabung ke grup kami:\n\nhttps://chat.whatsapp.com/${inviteCode}`);
    } else {
      await sReply(`Untuk menggunakan bot, Anda harus bergabung ke grup kami:\n\n${dbSettings.linkIdentity}`);
    }
    return false;
  } catch (error) {
    log(error, true);
    await sReply('Terjadi kesalahan saat memverifikasi status Anda.');
    return false;
  }
};
export async function updateContact(jid, data = {}) {
  if (!jid || !jid.endsWith('@s.whatsapp.net')) return;
  try {
    await mongoStore.updateContact(jid, data);
  } catch (error) {
    await log(error, true);
  }
};
export async function processContactUpdate(contact) {
  const idFromEvent = contact.id;
  const trueJid = await mongoStore.resolveJid(idFromEvent);
  if (!trueJid) return;
  const dataToUpdate = {};
  const nameToUpdate = contact.notify || contact.name;
  if (idFromEvent.endsWith('@lid')) {
    dataToUpdate.lid = idFromEvent;
  }
  if (nameToUpdate) {
    dataToUpdate.name = nameToUpdate;
  }
  if (Object.keys(dataToUpdate).length === 0) return;
  await updateContact(trueJid, dataToUpdate);
};
export function checkDepth(currentObj, currentDepth = 0) {
  if (typeof currentObj !== 'object' || currentObj === null) return currentDepth;
  let maxDepth = currentDepth;
  if (Array.isArray(currentObj)) {
    for (const item of currentObj) {
      const depth = checkDepth(item, currentDepth + 1);
      maxDepth = Math.max(maxDepth, depth);
    }
  } else {
    for (const key in currentObj) {
      if (Object.prototype.hasOwnProperty.call(currentObj, key)) {
        const depth = checkDepth(currentObj[key], currentDepth + 1);
        maxDepth = Math.max(maxDepth, depth);
      }
    }
  }
  return maxDepth;
};
export function safeStringify(obj, space = 2) {
  const seen = new WeakMap();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        const originalDepth = seen.get(value);
        const currentPathDepth = checkDepth(value);
        if (originalDepth + currentPathDepth > 4) return '[Circular]';
        return value;
      }
      const depth = checkDepth(value);
      seen.set(value, depth);
    }
    if (typeof value === 'function') return `[Function: ${value.name || 'anonymous'}]`;
    return value;
  }, space);
};
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
export function formatTimeAgo(timestamp) {
  if (!timestamp) return 'tidak diketahui';
  const now = Date.now();
  const seconds = Math.floor((now - timestamp) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) {
    return Math.floor(interval) + " tahun yang lalu";
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    return Math.floor(interval) + " bulan yang lalu";
  }
  interval = seconds / 604800;
  if (interval > 1) {
    return Math.floor(interval) + " minggu yang lalu";
  }
  interval = seconds / 86400;
  if (interval > 1) {
    return Math.floor(interval) + " hari yang lalu";
  }
  interval = seconds / 3600;
  if (interval > 1) {
    return Math.floor(interval) + " jam yang lalu";
  }
  interval = seconds / 60;
  if (interval > 1) {
    return Math.floor(interval) + " menit yang lalu";
  }
  return Math.floor(seconds) + " detik yang lalu";
};
export function firstUpperCase(text, split = ' ') {
  return text.split(split).map(word => `${word.charAt(0).toUpperCase()}${word.slice(1)}`).join(' ');
};
export function list(arr, conj = 'and') {
  const len = arr.length;
  if (len === 0) return '';
  if (len === 1) return arr[0];
  return `${arr.slice(0, -1).join(', ')}${len > 1 ? `${len > 2 ? ',' : ''} ${conj} ` : ''}${arr.slice(-1)}`;
};
export function ulang(str, num) {
  return (new Array(num + 1)).join(str);
};
export function arrayRemove(arr, value) {
  return arr.filter(function (ele) {
    return ele != value;
  })
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
export async function mycmd(input) {
  if (Array.isArray(input)) {
    return input;
  }
  return input.split(';').map(cmd => cmd.trim()).filter(cmd => cmd.length > 0);
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
    log(`Error: ${error.message}`, true); throw error;
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
  const tmpFileIn = tmpDir.createTempFile('webp');
  const tmpFileOut = tmpDir.createTempFile('webp', 'tempIk');
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
    await tmpDir.deleteFile(tmpFileIn);
    img.exif = exif;
    await img.save(tmpFileOut);
    return tmpFileOut;
  } else {
    return tmpFileIn;
  };
};
export async function convertAudio(inputPath, { isNotVoice = true } = {}) {
  return new Promise((resolve, reject) => {
    const format = isNotVoice ? 'mp3' : 'ogg';
    const audioCodec = isNotVoice ? 'libmp3lame' : 'libopus';
    const audioBitrate = isNotVoice ? '128k' : '48k';
    const audioChannels = isNotVoice ? 2 : 1;
    const outputPath = tmpDir.createTempFile('mp3');
    ffmpeg(inputPath)
      .setFfmpegPath(config.paths.ffmpeg)
      .setFfprobePath(config.paths.ffprobe)
      .noVideo()
      .format(format)
      .audioCodec(audioCodec)
      .audioBitrate(audioBitrate)
      .audioChannels(audioChannels)
      .addOption('-avoid_negative_ts', 'make_zero')
      .on('error', reject)
      .on('end', () => resolve(outputPath))
      .save(outputPath);
  });
};
export async function sendAndCleanupFile(fn, toId, localPath, m, dbSettings) {
  try {
    const ext = path.extname(localPath).toLowerCase();
    const stickerExtensions = new Set(['.gif', '.webp']);
    const mediaExtensions = new Set(['.png', '.jpg', '.jpeg', '.mp4']);
    if (stickerExtensions.has(ext)) {
      await fn.sendRawWebpAsSticker(toId, localPath, m, {
        packname: dbSettings.packName,
        author: dbSettings.packAuthor
      });
    } else if (mediaExtensions.has(ext)) {
      await fn.sendFilePath(toId, dbSettings.autocommand, localPath, { quoted: m });
    } else {
      await fn.sendReply(toId, `File generated at: ${localPath}`, { quoted: m });
    }
  } catch (error) {
    await log(error, true);
    await fn.sendReply(toId, `Gagal mengirim file: ${error.message}`, { quoted: m });
  } finally {
    await tmpDir.deleteFile(localPath);
  }
};
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
    profileImage = await loadImage(await fs.readFile('../media/apatar.png'));
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
};
export async function expiredCheck(fn, ownerNumber) {
  if (_checkPremium) return;
  _checkPremium = true;
  const premiumCheckInterval = setInterval(async () => {
    const expiredUsers = await User.getExpiredPremiumUsers();
    for (const user of expiredUsers) {
      const latestMessageFromOwner = await StoreMessages.getLatestMessage(ownerNumber[0]);
      const notificationText = `Premium expired: @${user.userId.split('@')[0]}`;
      if (latestMessageFromOwner) {
        await fn.sendPesan(ownerNumber[0], notificationText, { quoted: latestMessageFromOwner });
      } else {
        await fn.sendPesan(ownerNumber[0], notificationText);
      }
      await User.removePremium(user.userId);
    }
  }, config.performance.defaultInterval);
  global.activeIntervals.push(premiumCheckInterval);
};
export async function expiredVIPcheck(fn, ownerNumber) {
  if (_checkVIP) return;
  _checkVIP = true;
  const vipCheckInterval = setInterval(async () => {
    const expiredUsers = await User.getExpiredVIPUsers();
    for (const user of expiredUsers) {
      const latestMessageFromOwner = await StoreMessages.getLatestMessage(ownerNumber[0]);
      const notificationText = `VIP expired: @${user.userId.split('@')[0]}`;
      if (latestMessageFromOwner) {
        await fn.sendPesan(ownerNumber[0], notificationText, { quoted: latestMessageFromOwner });
      } else {
        await fn.sendPesan(ownerNumber[0], notificationText);
      }
      await User.removeVIP(user.userId);
    }
  }, config.performance.defaultInterval);
  global.activeIntervals.push(vipCheckInterval);
};
export async function getSerial(m) {
  if (m?.key?.fromMe) return;
  const sender = m.sender;
  return sender;
};
export async function getTxt(txt, dbSettings) {
  if (txt.startsWith(dbSettings.rname)) {
    txt = txt.replace(dbSettings.rname, "");
  } else if (txt.startsWith(dbSettings.sname)) {
    txt = txt.replace(dbSettings.sname, "");
  }
  txt = txt.trim();
  return txt;
};
export function gifToWebp(media) {
  return runStickerConversion(media, 'video');
};
export function imageToWebp(media) {
  return runStickerConversion(media, 'image');
}
export function videoToWebp(media) {
  return runStickerConversion(media, 'video');
};
export async function saveFile(imageInput, prefix, toFile = "png") {
  let imageBuffer;
  if (typeof imageInput === 'string' && imageInput.startsWith('data:image')) {
    const base64Data = imageInput.split(';base64,').pop();
    imageBuffer = Buffer.from(base64Data, 'base64');
  } else if (Buffer.isBuffer(imageInput)) {
    imageBuffer = imageInput;
  } else {
    throw new Error('Input tidak valid. Harap berikan Buffer atau string Base64.');
  }
  const ext = toFile.toLowerCase() === "jpg" ? "jpg" : "png";
  const tmpPath = path.join(global.tmpDir, `${prefix}-${Date.now()}.${ext}`);
  if (ext === "jpg") {
    await sharp(imageBuffer).jpeg({ quality: 90, progressive: true, mozjpeg: true }).toFile(tmpPath);
  } else {
    await sharp(imageBuffer).png().toFile(tmpPath);
  }
  return tmpPath;
};
export function parseCheatAmount(inputStr) {
  if (!inputStr) return null;
  let str = inputStr.toLowerCase().replace(',', '.').trim();
  const suffix = str.slice(-1);
  const multipliers = {
    k: 1000n,
    m: 1000000n,
    b: 1000000000n,
    t: 1000000000000n,
    q: 1000000000000000n,
    z: 1000000000000000000n
  };
  if (multipliers[suffix]) {
    const numPart = str.slice(0, -1);
    if (!/^\d*\.?\d*$/.test(numPart)) return null;
    if (numPart.includes('.')) {
      const parts = numPart.split('.');
      const integerPart = parts[0];
      const decimalPart = parts[1] || '';
      const decimalLength = decimalPart.length;
      const combined = integerPart + decimalPart;
      if (!combined.match(/^\d+$/)) return null;
      const base = BigInt(combined);
      const multiplier = multipliers[suffix];
      const divisor = 10n ** BigInt(decimalLength);
      const result = (base * multiplier) / divisor;
      return result > 0n ? result : null;
    } else {
      try {
        const base = BigInt(numPart);
        const result = base * multipliers[suffix];
        return result > 0n ? result : null;
      } catch {
        return null;
      }
    }
  }
  try {
    const val = BigInt(str);
    return val > 0n ? val : null;
  } catch {
    return null;
  }
};
export function formatNumber(number, minimumFractionDigits = 0) {
  if (typeof number === 'bigint') {
    return number.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  } else {
    return Number.parseFloat(number).toLocaleString(undefined, {
      minimumFractionDigits,
      maximumFractionDigits: 2
    });
  }
};
export async function getCommonGroups(userId) {
  try {
    const groups = await StoreGroupMetadata.find({ 'participants.id': userId }).lean();
    return groups;
  } catch (error) {
    await log(`Error_CommonGroups\n${error}`, true);
    return [];
  }
};