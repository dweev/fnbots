// ─── Info ──────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── info src/function/function.js ─────────────

import os from 'os';
import path from 'path';
import sharp from 'sharp';
import Fuse from 'fuse.js';
import crypto from 'crypto';
import log from '../lib/logger.js';
import config from '../../config.js';
import speedTest from 'speedtest-net';
import dayjs from '../utils/dayjs.js';
import { tmpDir } from '../lib/tempManager.js';
import { User } from '../../database/index.js';
import { pluginCache } from '../lib/plugins.js';
import { fetch as nativeFetch } from '../addon/bridge.js';

let fuse;
let allCmds           = [];
let _checkVIP         = false;
let _checkPremium     = false;

const wil_cache = {
  provinces: null,
  regencies: null,
  districts: null,
  villages: null
};

const fuseOptions = {
  includeScore: true,
  threshold: 0.25,
  minMatchCharLength: 2,
  distance: 25
};

function isJID(str) {
  return str.includes('@') && (str.endsWith('@s.whatsapp.net') || str.endsWith('@lid'));
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
    await fn.sendPesan(toId, suggestionText, { ephemeralExpiration: m.expiration ?? 0 });
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
export async function checkCommandAccess(command, userData, user, maintenance) {
  const {
    isSadmin, isMaster, isVIP, isPremium,
    isGroupAdmins, isWhiteList, hakIstimewa, isMuted
  } = userData;
  if (isSadmin) return { allowed: true };
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
  if (forbiddenCategories[userLevel]?.includes(command.category)) {
    return { allowed: false, reason: 'category' };
  }
  const isAllowedByState = (maintenance && (isWhiteList || hakIstimewa)) || (!maintenance && (hakIstimewa || !isMuted));
  if (!isAllowedByState) {
    return { allowed: false, reason: 'state' };
  }
  const isLimited = await user.isLimit();
  const isGameLimited = await user.isGameLimit();
  if (command.isCommandWithoutPayment) {
    return { allowed: true };
  }
  if (command.isLimitGameCommand && isGameLimited) {
    const shouldWarn = !user.limitgame.warned;
    return { 
      allowed: false, 
      reason: 'gamelimit', 
      shouldWarn: shouldWarn,
      needSetWarning: shouldWarn ? 'gamelimit' : null
    };
  }
  if (command.isLimitCommand && isLimited) {
    const shouldWarn = !user.limit.warned;
    return { 
      allowed: false, 
      reason: 'limit', 
      shouldWarn: shouldWarn,
      needSetWarning: shouldWarn ? 'limit' : null
    };
  }
  return { allowed: true };
};
export async function isUserVerified(m, dbSettings, store, fn, sReply, hakIstimewa) {
  if (m.fromMe || hakIstimewa) return true;
  if (m.isGroup) return true;
  try {
    const verificationGroupId = dbSettings.groupIdentity;
    if (!verificationGroupId) {
      log('Verification skipped: groupIdentity not set in dbSettings.');
      return true;
    }
    const metadata = await store.getGroupMetadata(verificationGroupId);
    if (!metadata) {
      log(`Verification skipped: Verification group ${verificationGroupId} not found in store.`);
      return true;
    }
    const isParticipant = metadata.participants.some(p => p.id === m.sender);
    if (isParticipant) {
      return true;
    }
    const botParticipant = metadata.participants.find(p => p.id === m.botnumber);
    if (botParticipant && botParticipant.admin) {
      const inviteCode = await fn.groupInviteCode(verificationGroupId);
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
export async function getSizeMedia(crots) {
  try {
    if (typeof crots === 'string' && /http/.test(crots)) {
      const response = await nativeFetch(crots, { method: 'HEAD' });
      if (!response.ok) {
        const getResponse = await nativeFetch(crots);
        const buffer = await getResponse.arrayBuffer();
        return bytesToSize(buffer.length, 3);
      }
      const length = response.headers.get('content-length');
      if (length && !isNaN(Number(length))) {
        return bytesToSize(Number(length), 3);
      } else {
        const getResponse = await nativeFetch(crots);
        const buffer = await getResponse.arrayBuffer();
        return bytesToSize(buffer.length, 3);
      }
    } else if (Buffer.isBuffer(crots)) {
      const length = Buffer.byteLength(crots);
      return bytesToSize(length, 3);
    } else {
      return '0 Bytes';
    }
  } catch (error) {
    log(`Error in getSizeMedia: ${error.message}`, true);
    return '0 Bytes';
  }
};
export function randomChoice(arr) {
  try {
    if (!Array.isArray(arr)) throw new TypeError('Input must be an array');
    if (arr.length === 0) throw new Error('Array cannot be empty');
    return arr[Math.floor(Math.random() * arr.length)];
  } catch (error) {
    console.error('Error in randomChoice: ', error);
    throw error;
  }
};
export function archimed(s, list) {
  const ln = list.length;
  const ls = new Set();
  for (const logic of s.split(',')) {
    if (logic.includes('>')) {
      const si = parseInt(logic.slice(1)) - 1;
      for (let i = si + 1; i < ln; i++) ls.add(i);
    } else if (logic.includes('<')) {
      const si = parseInt(logic.slice(1)) - 1;
      for (let i = 0; i <= si && i < ln; i++) ls.add(i);
    } else if (logic.includes('-')) {
      const [start, end] = logic.split('-').map(n => parseInt(n) - 1);
      for (let i = start; i <= end && i < ln; i++) ls.add(i);
    } else {
      const idx = parseInt(logic) - 1;
      if (idx >= 0 && idx < ln) ls.add(idx);
    }
  }
  return [...ls].map(i => list[i]);
};
export function parseSelector(selector, list) {
  if (!selector || !list || list.length === 0) return [];
  const normalized = selector.trim();
  if (normalized.toLowerCase() === 'all' || normalized.toLowerCase() === 'semua') {
    return list;
  }
  if (isJID(normalized)) {
    return list.includes(normalized) ? [normalized] : [];
  }
  if (/^\d+$/.test(normalized)) {
    const jidWithSuffix = `${normalized}@s.whatsapp.net`;
    const jidWithLid = `${normalized}@lid`;
    const found = list.find(item => item === jidWithSuffix || item === jidWithLid);
    return found ? [found] : [];
  }
  return archimed(normalized, list);
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
  var yDisplay = y > 0 ? y + (y === 1 ? " year, " : " years, ") : "";
  var bDisplay = b > 0 ? b + (b === 1 ? " month, " : " months, ") : "";
  var wDisplay = w > 0 ? w + (w === 1 ? " week, " : " weeks, ") : "";
  var dDisplay = d > 0 ? d + (d === 1 ? " day, " : " days, ") : "";
  var hDisplay = h > 0 ? h + (h === 1 ? " hour, " : " hours, ") : "";
  var mDisplay = m > 0 ? m + (m === 1 ? " minute, " : " minutes, ") : "";
  var sDisplay = s > 0 ? s + (s === 1 ? " second" : " seconds") : "";
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
  const years = duration.years();
  const months = duration.months();
  const days = duration.days();
  const hours = duration.hours();
  const minutes = duration.minutes();
  const seconds = duration.seconds();
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
    return ele !== value;
  });
};
export function randomByte(length = 32) {
  const bytes = crypto.randomBytes(Math.ceil(length / 2));
  return bytes.toString('hex').slice(0, length).toUpperCase();
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
export async function mycmd(input) {
  if (Array.isArray(input)) {
    return input;
  }
  return input.split(';').map(cmd => cmd.trim()).filter(cmd => cmd.length > 0);
};
export async function getBuffer(url, options = {}) {
  try {
    const { headers: optionHeaders, ...restOptions } = options;
    const response = await nativeFetch(url, {
      headers: {
        'DNT': '1',
        'Upgrade-Insecure-Request': '1',
        ...optionHeaders
      },
      ...restOptions
    });
    if (!response.ok) throw new Error(`Failed to get buffer with status: ${response.status} ${response.statusText}`);
    return await response.arrayBuffer();
  } catch (error) {
    log(`Error in getBuffer: ${error.message}`, true);
    throw error;
  }
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
  }
};
export async function expiredCheck(fn, ownerNumber, store) {
  if (_checkPremium) return;
  _checkPremium = true;
  setInterval(async () => {
    const expiredUsers = await User.getExpiredPremiumUsers();
    for (const user of expiredUsers) {
      const messages = await store.getMessages(ownerNumber[0], 1);
      const latestMessageFromOwner = messages && messages.length > 0 ? messages[0] : null;
      const notificationText = `Premium expired: @${user.userId.split('@')[0]}`;
      if (latestMessageFromOwner) {
        const expiration = await fn.getEphemeralExpiration(ownerNumber[0]);
        await fn.sendPesan(ownerNumber[0], notificationText, {
          quoted: latestMessageFromOwner,
          ephemeralExpiration: expiration
        });
      } else {
        const expiration = await fn.getEphemeralExpiration(ownerNumber[0]);
        await fn.sendPesan(ownerNumber[0], notificationText, {
          ephemeralExpiration: expiration
        });
      }
      await User.removePremium(user.userId);
    }
  }, config.performance.defaultInterval);
};
export async function expiredVIPcheck(fn, ownerNumber, store) {
  if (_checkVIP) return;
  _checkVIP = true;
  setInterval(async () => {
    const expiredUsers = await User.getExpiredVIPUsers();
    for (const user of expiredUsers) {
      const messages = await store.getMessages(ownerNumber[0], 1);
      const latestMessageFromOwner = messages && messages.length > 0 ? messages[0] : null;
      const notificationText = `VIP expired: @${user.userId.split('@')[0]}`;
      if (latestMessageFromOwner) {
        const expiration = await fn.getEphemeralExpiration(ownerNumber[0]);
        await fn.sendPesan(ownerNumber[0], notificationText, {
          quoted: latestMessageFromOwner,
          ephemeralExpiration: expiration
        });
      } else {
        const expiration = await fn.getEphemeralExpiration(ownerNumber[0]);
        await fn.sendPesan(ownerNumber[0], notificationText, {
          ephemeralExpiration: expiration
        });
      }
      await User.removeVIP(user.userId);
    }
  }, config.performance.defaultInterval);
};
export async function getSerial(m, dbSettings) {
  let sender;
  const selfMode = dbSettings.self;
  if (selfMode === 'true' || selfMode === 'auto') {
    sender = m.sender;
  } else {
    if (m?.key?.fromMe) return;
    sender = m.sender;
  }
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
  const tmpPath = tmpDir.createTempFile(ext);
  if (ext === "jpg") {
    await sharp(imageBuffer).jpeg({ quality: 90, progressive: true, mozjpeg: true }).toFile(tmpPath);
  } else {
    await sharp(imageBuffer).png().toFile(tmpPath);
  }
  return tmpPath;
};
export function parseCheatAmount(inputStr) {
  if (!inputStr) return null;
  const str = inputStr.toLowerCase().replace(',', '.').trim();
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
export function getServerIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "127.0.0.1";
};
export async function getCommonGroups(store, userId) {
  try {
    const allGroups = await store.getAllGroups({ 
        groupId: 1, 
        subject: 1, 
        participants: 1 
    });
    const commonGroups = allGroups.filter(group => 
      group.participants.some(p => p.id === userId)
    );
    return commonGroups;
  } catch (error) {
    await log(`Error_CommonGroups\n${error}`, true);
    return [];
  }
};
export async function speedtest() {
  try {
    const result = await speedTest({ acceptLicense: true, acceptGdpr: true });
    const download = (result.download.bandwidth / 125000).toFixed(2);
    const upload = (result.upload.bandwidth / 125000).toFixed(2);
    return { download, upload, ping: result.ping.latency.toFixed(2) };
  } catch {
    return { download: 'N/A', upload: 'N/A', ping: 'N/A' };
  }
};
export async function parseNIK(nik) {
  try {
    const nikString = nik.toString();
    if (nikString.length !== 16) throw new Error('NIK tidak valid: Panjang NIK harus 16 digit.');
    if (!wil_cache.provinces) {
      const res = await nativeFetch('https://raw.githubusercontent.com/Terror-Machine/random/master/data/provinsi.json');
      const data = await res.json();
      wil_cache.provinces = Object.fromEntries(data.map(p => [p.code, p.name.toUpperCase()]));
    }
    if (!wil_cache.regencies) {
      const res = await nativeFetch('https://raw.githubusercontent.com/Terror-Machine/random/master/data/kabupaten.json');
      const data = await res.json();
      wil_cache.regencies = Object.fromEntries(data.map(r => [r.full_code, r.name.toUpperCase()]));
    }
    if (!wil_cache.districts) {
      const res = await nativeFetch('https://raw.githubusercontent.com/Terror-Machine/random/master/data/kecamatan.json');
      const data = await res.json();
      wil_cache.districts = Object.fromEntries(data.map(d => [d.full_code, d.name.toUpperCase()]));
    }
    if (!wil_cache.villages) {
      const res = await nativeFetch('https://raw.githubusercontent.com/Terror-Machine/random/master/data/kelurahan.json');
      wil_cache.villages = await res.json();
    }
    const KODE_PROVINSI = nikString.slice(0, 2);
    const KODE_KABKOT = nikString.slice(0, 4);
    const KODE_KECAMATAN = nikString.slice(0, 6);

    if (!wil_cache.provinces[KODE_PROVINSI]) throw new Error('NIK tidak valid: Kode Provinsi tidak ditemukan.');
    if (!wil_cache.regencies[KODE_KABKOT]) throw new Error('NIK tidak valid: Kode Kabupaten/Kota tidak ditemukan.');
    if (!wil_cache.districts[KODE_KECAMATAN]) throw new Error('NIK tidak valid: Kode Kecamatan tidak ditemukan.');

    const daftarKelurahan = wil_cache.villages
      .filter(village => village.full_code.startsWith(KODE_KECAMATAN))
      .map(village => ({
        nama: village.name.toUpperCase(),
        kodePos: village.pos_code
      }));
    let kelurahanTerpilih = null;
    if (daftarKelurahan.length > 0) {
      const randomIndex = Math.floor(Math.random() * daftarKelurahan.length);
      kelurahanTerpilih = daftarKelurahan[randomIndex];
    }
    let tanggalLahir = parseInt(nikString.slice(6, 8));
    const bulanLahirString = nikString.slice(8, 10);
    const bulanLahir = parseInt(bulanLahirString, 10);
    if (isNaN(bulanLahir) || bulanLahir < 1 || bulanLahir > 12) throw new Error(`NIK tidak valid`);
    const tahunLahirKode = nikString.slice(10, 12);
    const gender = tanggalLahir > 40 ? 'PEREMPUAN' : 'LAKI-LAKI';
    if (gender === 'PEREMPUAN') {
      tanggalLahir -= 40;
    }
    const abadSekarang = Math.floor(new Date().getFullYear() / 100);
    const tahunLahir = (parseInt(tahunLahirKode) > new Date().getFullYear() % 100) ? (abadSekarang - 1).toString() + tahunLahirKode : abadSekarang.toString() + tahunLahirKode;
    const tglLahirObj = new Date(tahunLahir, bulanLahir - 1, tanggalLahir);
    if (isNaN(tglLahirObj.getTime()) || tglLahirObj.getDate() !== tanggalLahir) throw new Error('NIK tidak valid: Tanggal lahir tidak valid.');
    const today = new Date();
    let usiaTahun = today.getFullYear() - tglLahirObj.getFullYear();
    let usiaBulan = today.getMonth() - tglLahirObj.getMonth();
    let usiaHari = today.getDate() - tglLahirObj.getDate();
    if (usiaHari < 0) {
      usiaBulan--;
      usiaHari += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    }
    if (usiaBulan < 0) {
      usiaTahun--;
      usiaBulan += 12;
    }
    let hitungMundurTeks = '';
    const ultahBerikutnya = new Date(today.getFullYear(), bulanLahir - 1, tanggalLahir);
    if (ultahBerikutnya < today) {
      ultahBerikutnya.setFullYear(today.getFullYear() + 1);
    }
    if (ultahBerikutnya.toDateString() === today.toDateString()) {
      hitungMundurTeks = 'Selamat Ulang Tahun!';
    } else {
      const diff = ultahBerikutnya - today;
      const sisaHariTotal = Math.ceil(diff / (1000 * 60 * 60 * 24));
      const sisaBulan = Math.floor(sisaHariTotal / 30.44);
      const sisaHari = Math.floor(sisaHariTotal % 30.44);
      hitungMundurTeks = `${sisaBulan > 0 ? `${sisaBulan} Bulan ` : ''}${sisaHari > 0 ? `${sisaHari} Hari ` : ''}Lagi`.trim();
      if (!hitungMundurTeks) hitungMundurTeks = 'Besok!';
    }
    const pasaranNames = ['Pon', 'Wage', 'Kliwon', 'Legi', 'Pahing'];
    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const diffDays = Math.floor((tglLahirObj - new Date('1900-01-01')) / (1000 * 60 * 60 * 24));
    const hariPasaran = pasaranNames[diffDays % 5];
    const hariLahir = dayNames[tglLahirObj.getDay()];
    const getZodiac = (day, month) => {
      const zodiacs = [
        { sign: 'Capricorn', start: [12, 22], end: [1, 19] }, { sign: 'Aquarius', start: [1, 20], end: [2, 18] },
        { sign: 'Pisces', start: [2, 19], end: [3, 20] }, { sign: 'Aries', start: [3, 21], end: [4, 19] },
        { sign: 'Taurus', start: [4, 20], end: [5, 20] }, { sign: 'Gemini', start: [5, 21], end: [6, 21] },
        { sign: 'Cancer', start: [6, 22], end: [7, 22] }, { sign: 'Leo', start: [7, 23], end: [8, 22] },
        { sign: 'Virgo', start: [8, 23], end: [9, 22] }, { sign: 'Libra', start: [9, 23], end: [10, 23] },
        { sign: 'Scorpio', start: [10, 24], end: [11, 22] }, { sign: 'Sagittarius', start: [11, 23], end: [12, 21] }
      ];
      for (const z of zodiacs) {
        if ((month === z.start[0] && day >= z.start[1]) || (month === z.end[0] && day <= z.end[1])) return z.sign;
      }
    };
    const getGeneration = (year) => {
      if (year >= 2013) return 'Gen Alpha';
      if (year >= 1997) return 'Gen Z';
      if (year >= 1981) return 'Milenial';
      if (year >= 1965) return 'Gen X';
      if (year >= 1946) return 'Baby Boomer';
      return 'Generasi Terdahulu';
    };
    return {
      status: true,
      nik: nikString,
      jenisKelamin: gender,
      kelahiran: {
        tanggal: `${tanggalLahir.toString().padStart(2, '0')}-${bulanLahir.toString().padStart(2, '0')}-${tahunLahir}`,
        hari: `${hariLahir}, ${hariPasaran}`,
        zodiak: getZodiac(tanggalLahir, bulanLahir),
      },
      usia: {
        teks: `${usiaTahun} Tahun, ${usiaBulan} Bulan, ${usiaHari} Hari`,
        tahun: usiaTahun,
        kategori: usiaTahun < 17 ? 'Anak-anak/Remaja' : (usiaTahun < 65 ? 'Dewasa' : 'Lansia'),
        generasi: getGeneration(parseInt(tahunLahir)),
        ultah: hitungMundurTeks
      },
      lokasi: {
        provinsi: wil_cache.provinces[KODE_PROVINSI],
        kabupatenKota: wil_cache.regencies[KODE_KABKOT],
        kecamatan: wil_cache.districts[KODE_KECAMATAN],
        kelurahan: kelurahanTerpilih?.nama || 'Data Tidak Ditemukan',
        kodePos: kelurahanTerpilih?.kodePos || 'Tidak Ditemukan',
        kodeWilayah: `${KODE_PROVINSI}.${KODE_KABKOT.slice(2)}.${KODE_KECAMATAN.slice(4)}`
      },
    };
  } catch (error) {
    await log(`Error pada parseNIK:\n${error}`, true);
    return { status: false, nik: nik, error: error.message };
  }
};