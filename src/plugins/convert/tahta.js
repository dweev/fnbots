// ─── Info ────────────────────────────────
/*
* Created with ❤️ and 💦 By FN
* Follow https://github.com/Terror-Machine
* Feel Free To Use
*/
// ─── Info ────────────────────────────────

import { runJob } from '../../worker/worker_manager.js';

export const command = {
  name: 'tahta',
  category: 'convert',
  description: 'Membuat gambar HARTA TAHTA dengan teks kustom menggunakan ImageMagick.',
  isCommandWithoutPayment: true,
  execute: async ({ fn, m, args, toId, sReply, dbSettings }) => {
    const text = (args[0] || '').toUpperCase();
    if (!text) return await sReply(`Teks tidak boleh kosong.\nGunakan format: ${dbSettings.sname}tahta NAMA`);
    if (text.length > 8) return await sReply(`Teks terlalu panjang! Maksimal 8 huruf.`);
    if (/[^A-Z]/.test(text)) return await sReply(`Teks hanya boleh berisi huruf A-Z.`);
    const resultBuffer = await runJob('imageGenerator', {
      type: 'tahta',
      text1: text,
      outputFormat: 'jpg'
    });
    const outputBuffer = Buffer.isBuffer(resultBuffer) ? resultBuffer : Buffer.from(resultBuffer.data || resultBuffer);
    await fn.sendMediaFromBuffer(toId, 'image/jpeg', outputBuffer, dbSettings.autocommand, m);
  }
};