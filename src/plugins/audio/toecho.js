// ─── Info ────────────────────────────────
/*
 * Created with ❤️ and 💦 By FN
 * Follow https://github.com/Terror-Machine
 * Feel Free To Use
 */
// ─── Info ────────────────────────────────

import { runJob } from '../../worker/worker_manager.js';

export const command = {
  name: 'toecho',
  displayName: 'to-echo',
  category: 'audio',
  description: 'Menambahkan efek pada audio menggunakan ffmpeg.',
  aliases: ['to-echo'],
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, quotedMsg, toId, sReply }) => {
    if (!quotedMsg) return await sReply(`Mohon balas pesan audio yang ingin diubah.`);
    const mimeType = quotedMsg?.audioMessage?.mimetype;
    if (!mimeType || !mimeType.startsWith('audio/')) return await sReply(`Kirim atau balas pesan audio untuk diubah.`);
    const mediaBuffer = await fn.getMediaBuffer(quotedMsg);
    if (!mediaBuffer) return await sReply(`Gagal mengunduh media.`);
    const resultBuffer = await runJob('audioChanger', {
      mediaBuffer: mediaBuffer,
      filterName: 'echo'
    });
    await fn.sendMediaFromBuffer(toId, 'audio/mpeg', resultBuffer, '', m);
  }
};
