import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
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
      throw new Error(
        `${name} addon belum terbuild. Jalankan 'npm run build'.`,
      );
    }
  }
}

const stickerNative = loadAddon("sticker");

function isWebP(buf) {
  return (
    Buffer.isBuffer(buf) &&
    buf.length >= 12 &&
    buf.slice(0, 4).toString() === "RIFF" &&
    buf.slice(8, 12).toString() === "WEBP"
  );
}

export function addExif(buffer, meta = {}) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("addExif() input harus Buffer");
  }
  return stickerNative.addExif(buffer, meta);
}

export function sticker(buffer, options = {}) {
  const dbSettings = Settings.getSettings();
  if (!Buffer.isBuffer(buffer)) {
    throw new Error("sticker() input harus Buffer");
  }

  const opts = {
    crop: options.crop ?? false,
    quality: options.quality ?? 80,
    fps: options.fps ?? 15,
    maxDuration: options.maxDuration ?? 15,
    packName: options.packName || dbSettings.packName,
    authorName: options.authorName || dbSettings.packAuthor,
    emojis: options.emojis || [],
  };

  if (isWebP(buffer)) {
    return stickerNative.addExif(buffer, opts);
  }

  return stickerNative.sticker(buffer, opts);
}

export function encodeRGBA(buf, w, h, opt = {}) {
  if (!Buffer.isBuffer(buf)) {
    throw new Error("encodeRGBA() input harus Buffer");
  }
  return stickerNative.encodeRGBA(buf, w, h, opt);
}

const converterNative = loadAddon("converter");

export function convert(input, options = {}) {
  const buf = Buffer.isBuffer(input) ? input : input?.data;
  if (!Buffer.isBuffer(buf)) throw new Error("convert() input harus Buffer");

  return converterNative.convert(buf, {
    format: options.format || "opus",
    bitrate: options.bitrate || "64k",
    channels: options.channels ?? 2,
    sampleRate: options.sampleRate || 48000,
    ptt: !!options.ptt,
    vbr: options.vbr !== false,
  });
}

const ffmpegNative = loadAddon("convertMedia");


export function convertMedia(input, options = {}) {
  const buf = Buffer.isBuffer(input) ? input : input?.data;
  if (!Buffer.isBuffer(buf)) throw new Error("upscale() input harus Buffer");
  return ffmpegNative.upscale(buf, {
    scale: options.scale ?? 2.0,
    quality: options.quality ?? 1
  });
}

const fetchNative = loadAddon("fetch");
const textDecoder = new TextDecoder("utf-8");

export function fetch(url, options = {}) {
  if (typeof url !== "string") throw new TypeError("fetch() requires a URL string");
  if (!fetchNative) throw new Error("Native fetch addon not loaded");
  url = url.trim().replace(/\s+/g, "+").replace(/[\t\r\n]/g, "");
  if (!/^https?:\/\//i.test(url)) throw new Error("Invalid or unsupported URL protocol");
  const nativeFunc = fetchNative.startFetch || fetchNative.fetch;
  if (typeof nativeFunc !== "function") throw new Error("No valid native fetch entrypoint");
  const exec = typeof fetchNative.startFetch === "function" ? fetchNative.startFetch(url, options) : { promise: nativeFunc(url, options) };
  const promise = exec.promise || exec;
  return promise
    .then((res) => {
      if (!res || typeof res !== "object")
        throw new Error("Invalid response from native fetch");
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
              cachedTextRef.val = "";
            }
          }
          return Promise.resolve(cachedTextRef.val);
        },
        json() {
          try {
            if (cachedTextRef.val === null)
              cachedTextRef.val = textDecoder.decode(body);
            return Promise.resolve(JSON.parse(cachedTextRef.val));
          } catch (e) {
            return Promise.reject(
              new Error(`Invalid JSON: ${e.message}`)
            );
          }
        },
      };
      return out;
    })
    .catch((err) => {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`curl perform error: ${msg}`);
    });
}