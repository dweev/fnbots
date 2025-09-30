// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { runJob } from '../../worker/worker_manager.js';

export const command = {
  name: 'todizzy',
  displayName: 'to-dizzy',
  category: 'audio',
  description: 'Menambahkan efek pada audio menggunakan ffmpeg.',
  aliases: ['to-dizzy'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, quotedMsg, toId, sReply }) => {
    if (!quotedMsg) return await sReply(`Mohon balas pesan audio yang ingin diubah.`);
    const mimeType = quotedMsg?.audioMessage?.mimetype;
    if (!mimeType || !mimeType.startsWith('audio/')) throw new Error(`Kirim atau balas pesan audio untuk diubah.`);
    const mediaBuffer = await fn.getMediaBuffer(quotedMsg);
    if (!mediaBuffer) return await sReply(`Gagal mengunduh media.`);
    const resultBuffer = await runJob('audioChanger', {
      mediaBuffer: mediaBuffer,
      filterName: 'dizzy'
    });
    const outputBuffer = Buffer.isBuffer(resultBuffer) ? resultBuffer : Buffer.from(resultBuffer.data || resultBuffer);
    await fn.sendMessage(toId, {
      audio: outputBuffer,
      mimetype: 'audio/mpeg',
      ptt: quotedMsg.message?.audioMessage?.ptt || false
    }, { quoted: m });
  }
};