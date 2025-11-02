// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { audioChanger } from '../../function/index.js';

export const command = {
  name: 'tobass',
  displayName: 'to-bass',
  category: 'audio',
  description: 'Menambahkan efek bass pada audio menggunakan ffmpeg.',
  aliases: ['to-bass'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, quotedMsg, toId, sReply }) => {
    if (!quotedMsg) return await sReply(`Mohon balas pesan audio yang ingin diubah.`);
    const mimeType = quotedMsg?.audioMessage?.mimetype;
    if (!mimeType || !mimeType.startsWith('audio/')) return await sReply(`Kirim atau balas pesan audio untuk diubah.`);
    const mediaBuffer = await fn.getMediaBuffer(quotedMsg);
    if (!mediaBuffer) return await sReply(`Gagal mengunduh media.`);
    const resultBuffer = await audioChanger({
      mediaBuffer: mediaBuffer,
      filterName: 'bass'
    });
    await fn.sendMediaFromBuffer(toId, 'audio/mpeg', resultBuffer, '', m);
  }
};
