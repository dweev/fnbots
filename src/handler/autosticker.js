// ─── Info ─────────────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info src/handler/autosticker.js ──────────────

import log from '../lib/logger.js';

export class AutoStickerHandler {
  constructor(fn, runJob) {
    this.fn = fn;
    this.runJob = runJob;
    // prettier-ignore
    this.supportedMimeTypes = [
      "video/mp4",
      "image/gif",
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/jpg"
    ];
    this.maxVideoSeconds = 20;
  }
  async handle(params) {
    const { m, toId, fn, runJob, reactDone } = params;
    try {
      const mime = m.mime;
      if (!this.hasMediaContent(m)) {
        return;
      }
      if (this.shouldSkipConversion(m.body)) {
        return;
      }
      if (!this.isSupportedMedia(mime, m.message)) {
        return;
      }
      await this.convertToSticker(m, toId, fn, runJob, reactDone);
    } catch (error) {
      log(`Error in auto sticker handler: ${error}`, true);
    }
  }
  hasMediaContent(m) {
    return !!(m.message?.imageMessage || m.message?.videoMessage);
  }
  shouldSkipConversion(body) {
    if (!body || typeof body !== 'string') {
      return false;
    }
    return body.toLowerCase().includes('sticker');
  }
  isSupportedMedia(mime, message) {
    const isSupportedMime = this.supportedMimeTypes.includes(mime);
    if (!isSupportedMime) {
      return false;
    }
    if (mime.startsWith('image/')) {
      return true;
    }
    if (mime.startsWith('video/')) {
      const videoSeconds = message?.videoMessage?.seconds || 0;
      return videoSeconds < this.maxVideoSeconds;
    }
    return false;
  }
  async convertToSticker(m, toId, fn, runJob, reactDone) {
    try {
      await fn.sendMessage(toId, { react: { text: '⏳', key: m.key } });
      const buffer = await fn.getMediaBuffer(m.message);
      if (!buffer) {
        log('Failed to get media buffer');
        return;
      }
      const stickerBuffer = await runJob('stickerNative', {
        mediaBuffer: buffer
      });
      if (!stickerBuffer) {
        log('Failed to generate sticker buffer');
        return;
      }
      await fn.sendMessage(toId, { sticker: stickerBuffer }, { quoted: m, ephemeralExpiration: m.expiration ?? 0 });
      await reactDone();
    } catch (error) {
      log(`Error converting to sticker: ${error}`, true);
      try {
        await fn.sendMessage(toId, { react: { text: '', key: m.key } });
      } catch (reactError) {
        log(`Error removing reaction: ${reactError}`, true);
      }
    }
  }
}

export const handleAutoSticker = async (params) => {
  const handler = new AutoStickerHandler(params.fn, params.runJob);
  return await handler.handle(params);
};
