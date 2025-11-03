/** @file src/addon/bridge.js
 * Bridge antara JavaScript dan native addon C++ untuk berbagai fungsi media.
 * Menyediakan fungsi untuk pembuatan stiker, konversi media, pengambilan data via HTTP,
 * dan penjadwalan tugas cron.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { Settings } from '../../database/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

function loadAddon(name) {
  try {
    return require(path.join(__dirname, `../../build/Release/${name}.node`));
  } catch {
    try {
      return require(path.join(__dirname, `../../build/Debug/${name}.node`));
    } catch {
      throw new Error(`${name} addon belum terbuild. Jalankan 'npm run build'.`);
    }
  }
}

const stickerNative = loadAddon('sticker');
const converterNative = loadAddon('converter');
const ffmpegNative = loadAddon('convertMedia');
const mediaNative = loadAddon('media');
const fetchNative = loadAddon('fetch');
const cronNative = loadAddon('cron');

const jobs = new Map();
const textDecoder = new TextDecoder('utf-8');

function isWebP(buf) {
  return Buffer.isBuffer(buf) && buf.length >= 12 && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP';
}

export function addExif(buffer, meta = {}) {
  const dbSettings = Settings.getSettings();
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('addExif() input harus Buffer');
  }
  const opts = {
    packName: meta.packName || dbSettings.packName,
    authorName: meta.authorName || dbSettings.packAuthor,
    emojis: meta.emojis || []
  };
  return stickerNative.addExif(buffer, opts);
}

export function sticker(buffer, options = {}) {
  const dbSettings = Settings.getSettings();
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('sticker() input harus Buffer');
  }
  const opts = {
    cornerRadius: options.cornerRadius ?? 40,
    crop: options.crop ?? false,
    quality: options.quality ?? 80,
    fps: options.fps ?? 15,
    maxDuration: options.maxDuration ?? 15,
    packName: options.packName || dbSettings.packName,
    authorName: options.authorName || dbSettings.packAuthor,
    emojis: options.emojis || []
  };
  if (isWebP(buffer)) {
    return stickerNative.addExif(buffer, opts);
  }
  return stickerNative.sticker(buffer, opts);
}

export function isAnimated(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('isAnimated() input harus Buffer');
  }
  return stickerNative.isAnimated(buffer);
}

export function stickerToImage(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('stickerToImage() input harus Buffer');
  }
  return stickerNative.toImage(buffer);
}

export function stickerToVideo(buffer, options = {}) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('stickerToVideo() input harus Buffer');
  }
  const opts = {
    fps: options.fps ?? 15
  };
  return stickerNative.toVideo(buffer, opts);
}

export function encodeRGBA(buf, w, h, opt = {}) {
  if (!Buffer.isBuffer(buf)) {
    throw new Error('encodeRGBA() input harus Buffer');
  }
  return stickerNative.encodeRGBA(buf, w, h, opt);
}

export function convert(input, options = {}) {
  const buf = Buffer.isBuffer(input) ? input : input?.data;
  if (!Buffer.isBuffer(buf)) throw new Error('convert() input harus Buffer');
  return converterNative.convert(buf, {
    format: options.format || 'opus',
    bitrate: options.bitrate || '64k',
    channels: options.channels ?? 2,
    sampleRate: options.sampleRate || 48000,
    ptt: !!options.ptt,
    vbr: options.vbr !== false
  });
}

export function convertMedia(input, options = {}) {
  const buf = Buffer.isBuffer(input) ? input : input?.data;
  if (!Buffer.isBuffer(buf)) throw new Error('upscale() input harus Buffer');
  return ffmpegNative.upscale(buf, {
    scale: options.scale ?? 2.0,
    quality: options.quality ?? 1
  });
}

export function mergeVideoAudio(videoBuffer, audioBuffer, options = {}) {
  if (!Buffer.isBuffer(videoBuffer)) {
    throw new Error('mergeVideoAudio() videoBuffer harus Buffer');
  }
  if (!Buffer.isBuffer(audioBuffer)) {
    throw new Error('mergeVideoAudio() audioBuffer harus Buffer');
  }
  return mediaNative.mergeVideoAudio(videoBuffer, audioBuffer, {
    preset: options.preset || 'fast',
    crf: options.crf ?? 23
  });
}

export function fetch(url, options = {}) {
  if (typeof url !== 'string') throw new TypeError('fetch() requires a URL string');
  if (!fetchNative) throw new Error('Native fetch addon not loaded');
  // prettier-ignore
  url = url.trim().replace(/\s+/g, '+').replace(/[\t\r\n]/g, '');
  if (!/^https?:\/\//i.test(url)) throw new Error('Invalid or unsupported URL protocol');
  const nativeFunc = fetchNative.startFetch || fetchNative.fetch;
  if (typeof nativeFunc !== 'function') throw new Error('No valid native fetch entrypoint');
  const exec = typeof fetchNative.startFetch === 'function' ? fetchNative.startFetch(url, options) : { promise: nativeFunc(url, options) };
  const promise = exec.promise || exec;
  return promise
    .then((res) => {
      if (!res || typeof res !== 'object') throw new Error('Invalid response from native fetch');
      let body = res.body;
      if (Array.isArray(body)) {
        body = Buffer.from(body.buffer || body);
      } else if (!Buffer.isBuffer(body)) {
        try {
          body = Buffer.from(body || []);
        } catch {
          body = Buffer.alloc(0);
        }
      }
      const cachedTextRef = { val: null };
      const out = {
        ...res,
        ok: res.status >= 200 && res.status < 300,
        abort: exec.abort,
        arrayBuffer() {
          return Promise.resolve(body);
        },
        text() {
          if (cachedTextRef.val === null) {
            try {
              cachedTextRef.val = textDecoder.decode(body);
            } catch {
              cachedTextRef.val = '';
            }
          }
          return Promise.resolve(cachedTextRef.val);
        },
        json() {
          try {
            if (cachedTextRef.val === null) cachedTextRef.val = textDecoder.decode(body);
            return Promise.resolve(JSON.parse(cachedTextRef.val));
          } catch (e) {
            return Promise.reject(new Error(`Invalid JSON: ${e.message}`));
          }
        }
      };
      return out;
    })
    .catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`curl perform error: ${msg}`);
    });
}

export function parseArgsToFetchOptions(argsArray) {
  if (!argsArray || argsArray.length === 0) {
    throw new Error('URL tidak diberikan!');
  }
  const result = {
    url: argsArray[0],
    options: {
      method: 'GET',
      headers: {},
      timeout: 30000,
      decompress: true,
      maxRedirects: 10
    }
  };
  for (let i = 1; i < argsArray.length; i++) {
    const arg = argsArray[i];
    const value = argsArray[i + 1];
    switch (arg) {
      case '--method':
      case '--metode':
        if (value) {
          result.options.method = value.toUpperCase();
          i++;
        }
        break;
      case '--headers':
        if (value) {
          value.split(';').forEach((h) => {
            const [key, ...val] = h.split(':');
            if (key && val.length > 0) {
              result.options.headers[key.trim()] = val.join(':').trim();
            }
          });
          i++;
        }
        break;
      case '--data':
        if (value) {
          try {
            const parsed = JSON.parse(value);
            result.options.body = JSON.stringify(parsed);
            if (!result.options.headers['Content-Type']) {
              result.options.headers['Content-Type'] = 'application/json';
            }
          } catch (e) {
            throw new Error('Data JSON tidak valid: ' + e.message);
          }
          i++;
        }
        break;
      case '--cookie':
        if (value) {
          result.options.cookie = value;
          i++;
        }
        break;
      case '--proxy':
        if (value) {
          result.options.proxy = value;
          i++;
        }
        break;
    }
  }
  return result;
}

export function getHeader(headers, key) {
  if (!headers || typeof headers !== 'object') return null;
  const lowerKey = key.toLowerCase();
  if (headers.__first && typeof headers.__first === 'object') {
    for (const [k, v] of Object.entries(headers.__first)) {
      if (k.toLowerCase() === lowerKey) return v;
    }
  }
  for (const [k, v] of Object.entries(headers)) {
    if (k === '__first') continue;
    if (k.toLowerCase() === lowerKey) {
      if (Array.isArray(v) && v.length > 0) return v[0];
      return v;
    }
  }
  return null;
}

class CronJob {
  constructor(name, handle) {
    this._name = name;
    this._handle = handle;
    if (this._handle?.start) this._handle.start();
  }
  stop() {
    if (this._handle?.stop) {
      this._handle.stop();
      this._handle = null;
      jobs.delete(this._name);
    }
  }
  isRunning() {
    return this._handle?.isRunning?.() ?? false;
  }
  secondsToNext() {
    return this._handle?.secondsToNext?.() ?? -1;
  }
}

export function schedule(exprOrName, callback, options = {}) {
  if (typeof callback !== 'function') throw new Error('schedule() requires a callback function');
  const handle = cronNative.schedule(exprOrName, callback, options);
  const job = new CronJob(exprOrName, handle);
  jobs.set(exprOrName, job);
  return job;
}
