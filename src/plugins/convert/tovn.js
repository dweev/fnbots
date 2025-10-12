// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { convert as convertNative } from '../../addon/bridge.js';

export const command = {
  name: 'tovn',
  category: 'convert',
  description: 'Convert audio ke voice note (PTT) menggunakan native addon',
  isCommandWithoutPayment: true,
  aliases: ['toptt'],
  execute: async ({ fn, m, quotedMsg, toId, sReply }) => {
    const targetMsg = quotedMsg ? m.quoted || m : m.message;
    const mime = targetMsg?.audioMessage?.mimetype || targetMsg?.videoMessage?.mimetype || targetMsg?.documentMessage?.mimetype;
    if (!mime || (!mime.includes('audio') && !mime.includes('video'))) return await sReply("Silakan balas audio/video atau kirim audio/video dengan caption `.tovn`.");
    const buffer = await fn.getMediaBuffer(targetMsg);
    if (!buffer) return await sReply("Gagal mendapatkan data media dari pesan.");
    const outputBuffer = convertNative(buffer, {
      format: 'ogg',
      sampleRate: 48000,
      channels: 1,
      ptt: true,
      vbr: true,
      bitrate: '48k'
    });
    await fn.sendMediaFromBuffer(toId, 'audio/ogg; codecs=opus', outputBuffer, "", m, { ptt: true });
  }
};