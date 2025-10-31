// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { convert as convertNative } from '../../addon/bridge.js';

export const command = {
  name: 'toaudio',
  category: 'convert',
  description: 'Convert video/audio ke MP3 menggunakan native addon',
  isCommandWithoutPayment: true,
  aliases: ['tomp3'],
  execute: async ({ fn, m, quotedMsg, toId, sReply }) => {
    const targetMsg = quotedMsg ? m.quoted || m : m.message;
    const mime = targetMsg?.videoMessage?.mimetype || targetMsg?.documentMessage?.mimetype || targetMsg?.audioMessage?.mimetype;
    if (!mime) return await sReply('Silakan balas atau kirim media dengan caption `.tomp3`.');
    const buffer = await fn.getMediaBuffer(targetMsg);
    if (!buffer) return await sReply('Gagal mendapatkan data media dari pesan.');
    const outputBuffer = convertNative(buffer, {
      format: 'mp3',
      sampleRate: 44100,
      channels: 2,
      ptt: false,
      vbr: true,
      bitrate: '128k'
    });
    await fn.sendMediaFromBuffer(toId, 'audio/mpeg', outputBuffer, '', m, { ptt: false });
  }
};
