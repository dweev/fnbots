// ─── Info ─────────────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info src/handler/autochanger.js ──────────────

import log from '../lib/logger.js';

export class AudioChangerHandler {
  constructor(fn, runJob) {
    this.fn = fn;
    this.runJob = runJob;
    this.supportedMediaTypes = new Set([
      'audio/ogg; codecs=opus',
      'audio/mpeg',
      'audio/mp4',
      'audio/m4a',
      'audio/aac',
      'audio/wav',
      'audio/amr'
    ]);
  }
  async handle(params) {
    const { m, toId, fn, selfMode, fromBot, runJob, sReply } = params;
    try {
      if (selfMode === 'auto' && fromBot) {
        return;
      }
      if (!this.isSupportedAudioType(m.mime)) {
        return;
      }
      await this.processAudioMessage(m, toId, fn, runJob, sReply);
    } catch (error) {
      log(`Error in audio changer handler: ${error}`, true);
      await sReply('Terjadi kesalahan saat memproses audio.');
    }
  }
  isSupportedAudioType(mimeType) {
    return this.supportedMediaTypes.has(mimeType);
  }
  async processAudioMessage(m, toId, fn, runJob, sReply) {
    try {
      const mediaData = await fn.getMediaBuffer(m.message);
      if (!mediaData) {
        await sReply('Gagal mengambil data audio.');
        return;
      }
      const resultBuffer = await runJob('audioChanger', { mediaBuffer: mediaData, filterName: null });
      if (!resultBuffer) {
        await sReply('Gagal memproses audio melalui voice changer.');
        return;
      }
      const finalBuffer = this.convertToBuffer(resultBuffer);
      if (!finalBuffer) {
        await sReply(`Cannot convert result to Buffer: type=${typeof resultBuffer}, constructor=${resultBuffer?.constructor?.name}`);
        return;
      }
      if (!this.isValidBuffer(finalBuffer)) {
        await sReply(`Invalid final buffer: ${typeof finalBuffer}, length: ${finalBuffer?.length}`);
        return;
      }
      await fn.sendMediaFromBuffer(toId, 'audio/mpeg', finalBuffer, '', m);
    } catch (error) {
      log(`Error processing audio message: ${error}`, true);
      await sReply('Gagal memproses pesan audio.');
    }
  }
  convertToBuffer(resultBuffer) {
    try {
      if (Buffer.isBuffer(resultBuffer)) {
        return resultBuffer;
      }
      if (resultBuffer && resultBuffer.type === 'Buffer' && resultBuffer.data) {
        if (Array.isArray(resultBuffer.data)) {
          return Buffer.from(resultBuffer.data);
        }
      }
      if (resultBuffer && Array.isArray(resultBuffer.data)) {
        return Buffer.from(resultBuffer.data);
      }
      if (resultBuffer && resultBuffer.length && typeof resultBuffer[0] === 'number') {
        return Buffer.from(resultBuffer);
      }
      if (resultBuffer && typeof resultBuffer.length === 'number' && resultBuffer.constructor) {
        try {
          return Buffer.from(resultBuffer);
        } catch (conversionError) {
          log(`Buffer conversion failed: ${conversionError}`);
        }
      }
      return null;
    } catch (error) {
      log(`Error converting to buffer: ${error}`, true);
      return null;
    }
  }
  isValidBuffer(buffer) {
    return buffer &&
      Buffer.isBuffer(buffer) &&
      buffer.length > 0;
  }
}

export const handleAudioChanger = async (params) => {
  const handler = new AudioChangerHandler(params.fn, params.runJob);
  return await handler.handle(params);
};