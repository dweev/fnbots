// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { audioChanger } from '../../function/index.js';

export const command = {
  name: 'tohaunted',
  displayName: 'to-haunted',
  category: 'audio',
  description: 'Menambahkan efek pada audio menggunakan ffmpeg.',
  aliases: ['to-haunted'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, quotedMsg, toId, sReply }) => {
    if (!quotedMsg) return await sReply(`Mohon balas pesan audio yang ingin diubah.`);
    const mimeType = quotedMsg?.audioMessage?.mimetype;
    if (!mimeType || !mimeType.startsWith('audio/')) return await sReply(`Kirim atau balas pesan audio untuk diubah.`);
    const mediaBuffer = await fn.getMediaBuffer(quotedMsg);
    if (!mediaBuffer) return await sReply(`Gagal mengunduh media.`);
    const resultBuffer = await audioChanger({
      mediaBuffer: mediaBuffer,
      filterName: 'haunted'
    });
    await fn.sendMediaFromBuffer(toId, 'audio/mpeg', resultBuffer, '', m);
  }
};
